import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';
import { upload } from '../upload.js';

const router = Router();

// GET /api/stock-receiving
router.get('/', authenticateToken, async (_req, res: Response) => {
  try {
    const records = await prisma.stockReceiving.findMany({
      include: { items: true },
      orderBy: { arrivalDate: 'desc' },
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock-receiving (Record freezer van stock and atomically update inventory)
router.post('/', authenticateToken, upload.single('receiptPhoto'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { poNumber, bodegaOrderId, truckPlate, driverInfo, receiverName, checkerName, arrivalDate, remarks } = req.body;
    if (!poNumber?.trim() || !truckPlate?.trim()) return res.status(400).json({ error: 'Receipt reference and freezer van details are required.' });
    if (!req.file) return res.status(400).json({ error: 'Attach a photo or PDF of the supplier receipt.' });

    let lines = req.body.items;
    if (typeof lines === 'string') {
      try { lines = JSON.parse(lines); } catch { return res.status(400).json({ error: 'Invalid received product list.' }); }
    }
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'Select at least one received product.' });
    if (new Set(lines.map((line: any) => String(line.productId))).size !== lines.length) return res.status(400).json({ error: 'Each product can only be listed once per receipt.' });

    const receivedDate = arrivalDate ? new Date(arrivalDate) : new Date();
    if (!Number.isFinite(receivedDate.getTime())) return res.status(400).json({ error: 'Enter a valid date and time received.' });
    const receivingId = `RCV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const photoPath = `/uploads/${req.file.filename}`;

    const record = await prisma.$transaction(async tx => {
      const receiveItems: any[] = [];
      const ledgerEntries: any[] = [];
      const discrepancies: any[] = [];
      let totalReceivedValue = 0;

      for (const line of lines) {
        const product = await tx.product.findUnique({ where: { id: String(line.productId) } });
        if (!product) throw new Error(`Product ${line.productId} is not in the active catalog.`);
        const quantities = [line.expectedQty, line.receivedGoodQty, line.damagedMeltedQty, line.missingQty].map((value: any) => Number(value ?? 0));
        if (quantities.some((value: number) => !Number.isInteger(value) || value < 0)) throw new Error(`Enter non-negative whole quantities for ${product.name}.`);
        const [enteredExpected, goodQty, damagedQty, enteredMissing] = quantities;
        if (goodQty + damagedQty + enteredMissing <= 0) throw new Error(`Enter a received, damaged, or missing quantity for ${product.name}.`);
        const expectedQty = enteredExpected || goodQty + damagedQty + enteredMissing;
        const missingQty = Math.max(enteredMissing, expectedQty - goodQty - damagedQty);
        if (goodQty + damagedQty + missingQty > expectedQty) throw new Error(`Received quantities exceed expected quantity for ${product.name}.`);
        const unitPrice = Number(product.dealerPrice) || Number(product.sellingPrice);
        totalReceivedValue += goodQty * unitPrice;
        receiveItems.push({ productId: product.id, productName: product.name, category: product.category, expectedQty, receivedGoodQty: goodQty, damagedMeltedQty: damagedQty, missingQty, unitPrice, notes: line.notes || null });

        const updated = await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: goodQty }, quarantineStock: { increment: damagedQty } },
        });
        if (goodQty > 0) ledgerEntries.push({ productId: product.id, productName: product.name, movementType: 'Supplier Receiving', changeQty: goodQty, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: receivingId, staffName: receiverName?.trim() || req.user?.name || 'Receiver', notes: `Freezer van receipt ${poNumber.trim()}` });
        if (damagedQty > 0) {
          const discrepancyId = `BO-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
          discrepancies.push({ id: discrepancyId, deliveryRef: receivingId, storeName: 'Supplier Freezer Van', productId: product.id, productName: product.name, category: product.category, quantity: damagedQty, unitPrice, totalDeduction: Number((damagedQty * unitPrice).toFixed(2)), reason: 'Received damaged or melted from supplier freezer van', reportedBy: checkerName?.trim() || req.user?.name || 'Checker', disposition: 'Pending', notes: `Quarantined at receipt ${poNumber.trim()}` });
          ledgerEntries.push({ productId: product.id, productName: product.name, movementType: 'BO Quarantine', changeQty: damagedQty, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: receivingId, staffName: checkerName?.trim() || req.user?.name || 'Checker', notes: `Quarantined on receipt ${poNumber.trim()}` });
        }
      }

      const received = await tx.stockReceiving.create({
        data: {
          id: receivingId, poNumber: poNumber.trim(), bodegaOrderId: bodegaOrderId || null,
          truckPlate: truckPlate.trim(), driverInfo: driverInfo?.trim() || null,
          receiverName: receiverName?.trim() || req.user?.name || 'Warehouse Staff',
          checkerName: checkerName?.trim() || req.user?.name || 'Checker', arrivalDate: receivedDate,
          status: receiveItems.some(item => item.damagedMeltedQty || item.missingQty) ? 'Discrepancy Found' : 'Completed',
          totalReceivedValue, receiptPhotoPath: photoPath, remarks: remarks || null,
          items: { create: receiveItems },
        }, include: { items: true },
      });
      if (ledgerEntries.length) await tx.inventoryLedger.createMany({ data: ledgerEntries });
      if (discrepancies.length) await tx.boDiscrepancy.createMany({ data: discrepancies });
      if (bodegaOrderId) await tx.bodegaOrder.update({ where: { id: bodegaOrderId }, data: { status: 'Received' } });
      return received;
    });

    await recordAudit('Receive Stock', 'Stock Receiving', req.user?.name || 'Staff', { receivingId, poNumber, truckPlate, totalReceivedValue: record.totalReceivedValue, products: record.items.length });
    res.status(201).json(record);
  } catch (err: any) {
    if (err.message?.startsWith('Product ') || err.message?.startsWith('Enter ') || err.message?.startsWith('Received ')) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});
export default router;
