import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/delivery-runs
router.get('/', authenticateToken, async (req, res: Response) => {
  const { status, route, area, date } = req.query;
  try {
    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (route && route !== 'all') {
      where.route = String(route);
    }
    if (area && area !== 'all') where.area = String(area);
    if (date) {
      const d = new Date(String(date));
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      where.deliveryDate = { gte: start, lte: end };
    }

    const runs = await prisma.deliveryRun.findMany({
      where,
      include: {
        stops: {
          include: {
            items: true,
            customer: { select: { currentBalance: true } },
            invoice: {
              include: { payments: true },
            },
          },
          orderBy: { stopOrder: 'asc' },
        },
        reconciliation: true,
      },
      orderBy: { deliveryDate: 'desc' },
    });

    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/delivery-runs/:id
router.get('/:id', authenticateToken, async (req, res: Response) => {
  const { id } = req.params;
  try {
    const run = await prisma.deliveryRun.findUnique({
      where: { id },
      include: {
        stops: {
          include: {
            items: true,
            customer: { select: { currentBalance: true } },
            invoice: {
              include: { payments: true },
            },
          },
          orderBy: { stopOrder: 'asc' },
        },
        reconciliation: true,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Delivery run not found.' });
    }

    // Consolidated picking totals for warehouse crew
    const pickingMap = new Map<string, {
      productId: string;
      productName: string;
      totalLoadedQty: number;
      availableStock: number;
      isShort: boolean;
    }>();

    for (const stop of run.stops) {
      for (const item of stop.items) {
        if (!pickingMap.has(item.productId)) {
          const prod = await prisma.product.findUnique({ where: { id: item.productId } });
          const avail = prod ? Math.max(0, prod.stock - prod.reservedStock) : 0;
          pickingMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            totalLoadedQty: 0,
            availableStock: avail,
            isShort: false,
          });
        }
        const record = pickingMap.get(item.productId)!;
        record.totalLoadedQty += item.loadedQty;
        record.isShort = record.totalLoadedQty > record.availableStock;
      }
    }

    const pickingList = Array.from(pickingMap.values());

    res.json({
      run,
      pickingList,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery-runs (Prepare & Load run)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { route, area, deliveryDate, vehicle, driver, loader1, loader2, helper, collector, bookingIds, notes } = req.body;
  try {
    const deliveryArea = area || route;
    if (!deliveryArea || !driver || !loader1 || !loader2 || !bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        error: 'Area, driver, two loaders, and at least one booking are required to prepare a delivery run.',
      });
    }

    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds }, area: deliveryArea, status: 'Booked' },
      include: { items: true, customer: true },
    });

    if (bookings.length !== new Set(bookingIds).size) {
      return res.status(400).json({ error: 'Every selected booking must still be unassigned and belong to the selected area.' });
    }

    const runId = `RUN-${Date.now().toString().slice(-6)}`;
    const runNumber = `RUN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const stopsData: any[] = [];
    let stopIndex = 1;

    for (const b of bookings) {
      const deliveryItems = b.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        category: it.category,
        orderedQty: it.quantity,
        loadedQty: it.quantity,
        acceptedQty: it.quantity, // Default to ordered, updated upon delivery
        missingQty: 0,
        boRefusedQty: 0,
        intactReturnedQty: 0,
        unitPrice: it.unitPrice,
      }));

      stopsData.push({
        bookingId: b.id,
        customerId: b.customerId,
        storeName: b.storeName,
        stopOrder: stopIndex++,
        status: 'Pending',
        items: {
          create: deliveryItems,
        },
      });
    }

    const run = await prisma.$transaction(async tx => {
      const created = await tx.deliveryRun.create({
        data: {
          id: runId,
          runNumber,
          route: deliveryArea,
          area: deliveryArea,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          vehicle: vehicle || 'Bongo Refrigerated Van',
          driver: driver.trim(),
          loader1: loader1.trim(),
          loader2: loader2.trim(),
          helper: helper ? helper.trim() : null,
          collector: collector ? collector.trim() : driver.trim(),
          status: 'Prepared',
          notes: notes || null,
          stops: { create: stopsData },
        },
        include: { stops: { include: { items: true } } },
      });
      await tx.booking.updateMany({ where: { id: { in: bookingIds }, status: 'Booked', area: deliveryArea }, data: { status: 'Prepared' } });
      return created;
    });

    await recordAudit('Prepare Delivery Run', 'Prepare & Load', req.user?.name || 'Staff', {
      runNumber,
      route: deliveryArea,
      stopsCount: bookings.length,
    });

    res.status(201).json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery-runs/:id/dispatch (Check stock & dispatch vehicle)
router.post('/:id/dispatch', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const run = await prisma.deliveryRun.findUnique({
      where: { id },
      include: {
        stops: { include: { items: true } },
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Delivery run not found.' });
    }

    if (run.status !== 'Prepared') {
      return res.status(409).json({ error: `Only a prepared run can be dispatched (current status: ${run.status}).` });
    }

    // Consolidated required quantities
    const neededMap = new Map<string, number>();
    for (const stop of run.stops) {
      for (const item of stop.items) {
        neededMap.set(item.productId, (neededMap.get(item.productId) || 0) + item.loadedQty);
      }
    }

    // Check stock sufficiency
    const shortages: { productId: string; productName: string; needed: number; available: number }[] = [];
    for (const [prodId, neededQty] of neededMap.entries()) {
      const product = await prisma.product.findUnique({ where: { id: prodId } });
      if (!product) continue;
      const available = product.stock - product.reservedStock;
      if (neededQty > available) {
        shortages.push({
          productId: prodId,
          productName: product.name,
          needed: neededQty,
          available,
        });
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({ error: 'Dispatch blocked because there is not enough saleable stock.', shortages });
    }

    const bookingIds = run.stops.map((s) => s.bookingId);
    const updatedRun = await prisma.$transaction(async tx => {
      const ledgerEntries: any[] = [];
      for (const [prodId, neededQty] of neededMap.entries()) {
        const product = await tx.product.findUnique({ where: { id: prodId } });
        if (!product) throw new Error(`Product ${prodId} was removed from the catalog.`);
        const available = product.stock - product.reservedStock;
        if (neededQty > available) throw new Error(`Insufficient stock for ${product.name}: ${available} available, ${neededQty} needed.`);
        const updated = await tx.product.update({ where: { id: prodId }, data: { stock: { decrement: neededQty }, reservedStock: { increment: neededQty } } });
        ledgerEntries.push({ productId: prodId, productName: product.name, movementType: 'Dispatch', changeQty: -neededQty, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: run.runNumber, staffName: req.user?.name || 'Staff', notes: `Dispatched in delivery van (Trip: ${run.runNumber})` });
      }
      if (ledgerEntries.length) await tx.inventoryLedger.createMany({ data: ledgerEntries });
      const dispatched = await tx.deliveryRun.update({ where: { id }, data: { status: 'In Transit', dispatchedAt: new Date() } });
      await tx.booking.updateMany({ where: { id: { in: bookingIds } }, data: { status: 'In Transit' } });
      return dispatched;
    });

    await recordAudit('Dispatch Delivery Run', 'Delivery', req.user?.name || 'Staff', {
      runNumber: run.runNumber,
      shortagesChecked: shortages.length,
    });

    res.json({ success: true, run: updatedRun });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery-stops/:stopId/record (Record actual delivery results, bill, payment)
router.post('/stops/:stopId/fail', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { stopId } = req.params;
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Enter why this store could not receive the delivery.' });
  try {
    const stop = await prisma.deliveryStop.findUnique({ where: { id: stopId }, include: { items: true, deliveryRun: true } });
    if (!stop) return res.status(404).json({ error: 'Delivery stop not found.' });
    if (stop.deliveryRun.status !== 'In Transit') return res.status(409).json({ error: 'Backloads can only be recorded for a dispatched run.' });
    if (stop.status !== 'Pending' && stop.status !== 'In Progress') return res.status(409).json({ error: `This stop has already been recorded as ${stop.status}.` });
    const now = new Date();
    const failedStop = await prisma.$transaction(async tx => {
      for (const item of stop.items) {
        await tx.deliveryItem.update({ where: { id: item.id }, data: { acceptedQty: 0, missingQty: 0, boRefusedQty: 0, intactReturnedQty: item.loadedQty } });
      }
      const updated = await tx.deliveryStop.update({ where: { id: stopId }, data: { status: 'Failed', notes: reason, deliveredAt: now }, include: { items: true } });
      await tx.booking.update({ where: { id: stop.bookingId }, data: { status: 'Backload' } });
      const pending = await tx.deliveryStop.count({ where: { deliveryRunId: stop.deliveryRunId, status: { in: ['Pending', 'In Progress'] } } });
      if (pending === 0) await tx.deliveryRun.update({ where: { id: stop.deliveryRunId }, data: { status: 'Delivered', completedAt: now } });
      return updated;
    });
    await recordAudit('Delivery Failed / Backload', 'Delivery', req.user?.name || 'Staff', { stopId, reason });
    res.json({ success: true, stop: failedStop, backloadUnits: failedStop.items.reduce((sum, item) => sum + item.intactReturnedQty, 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stops/:stopId/record', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { stopId } = req.params;
  const {
    items: deliveredLines,
    recipientName,
    paymentMethod,
    amountPaid,
    paymentReference,
    bankName,
    checkDate,
    notes,
  } = req.body;

  try {
    const stop = await prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: {
        deliveryRun: true,
        items: true,
        invoice: { include: { payments: true } },
      },
    });

    if (!stop) {
      return res.status(404).json({ error: 'Delivery stop not found.' });
    }
    if (stop.deliveryRun.status !== 'In Transit') {
      return res.status(409).json({ error: 'Delivery results can only be recorded for a dispatched run.' });
    }
    if (stop.status !== 'Pending' && stop.status !== 'In Progress') {
      return res.status(409).json({ error: `This stop has already been recorded as ${stop.status}.` });
    }
    if (!Array.isArray(deliveredLines) || deliveredLines.length !== stop.items.length) {
      return res.status(400).json({ error: 'Enter delivery results for every loaded product.' });
    }
    const submittedItemIds = deliveredLines.map((line: any) => String(line.id || line.productId || ''));
    if (new Set(submittedItemIds).size !== stop.items.length || stop.items.some(item => !submittedItemIds.includes(item.id) && !submittedItemIds.includes(item.productId))) {
      return res.status(400).json({ error: 'Each loaded product must be recorded exactly once.' });
    }
    if (paymentMethod && !['Cash', 'GCash', 'Check', 'Bank Transfer'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Choose Cash, GCash, or Check for payment.' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: stop.customerId } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // 1. Calculate accepted, missing, BO refused
    let billableProductAmount = 0;
    const itemUpdates: { id: string; data: any }[] = [];
    const boDiscrepanciesToCreate: any[] = [];

    if (deliveredLines && Array.isArray(deliveredLines)) {
      for (const line of deliveredLines) {
        const existingItem = stop.items.find((it) => it.id === line.id || it.productId === line.productId);
        if (!existingItem) return res.status(400).json({ error: 'A submitted product does not belong to this delivery stop.' });

        const loaded = existingItem.loadedQty;
        const accepted = Number(line.acceptedQty);
        const missing = Number(line.missingQty) || 0;
        const boRefused = Number(line.boRefusedQty) || 0;
        if (![accepted, missing, boRefused].every(value => Number.isInteger(value) && value >= 0) || accepted + missing + boRefused > loaded) {
          return res.status(400).json({ error: `Accepted, missing, and BO quantities must be non-negative and cannot exceed the ${loaded} loaded units of ${existingItem.productName}.` });
        }
        const intactReturned = Math.max(0, loaded - (accepted + boRefused + missing));
        const unitPrice = existingItem.unitPrice;

        // SAFEGUARD: Billable Product Amount = actual saleable accepted quantity * unit price
        const lineBillable = accepted * unitPrice;
        billableProductAmount += lineBillable;

        itemUpdates.push({ id: existingItem.id, data: { acceptedQty: accepted, missingQty: missing, boRefusedQty: boRefused, intactReturnedQty: intactReturned, notes: line.notes || null } });

        // Record BO Refused discrepancy
        if (boRefused > 0) {
          boDiscrepanciesToCreate.push({
            id: `BO-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
            deliveryRef: stop.deliveryRun.runNumber,
            storeName: stop.storeName,
            productId: existingItem.productId,
            productName: existingItem.productName,
            category: existingItem.category || 'Unspecified',
            quantity: boRefused,
            unitPrice,
            totalDeduction: Number((boRefused * unitPrice).toFixed(2)),
            reason: `BO/melted refused by ${stop.storeName} and brought back in van`,
            reportedBy: stop.deliveryRun.collector || req.user?.name || 'Collector',
            disposition: 'Pending',
            notes: `Refused at store stop during delivery run ${stop.deliveryRun.runNumber}`,
          });
        }
      }
    } else {
      // Default: all loaded accepted
      billableProductAmount = stop.items.reduce((s, it) => s + it.loadedQty * it.unitPrice, 0);
    }

    // Net Amount Due = Billable Product Amount + prior balance (no double deduction of BO!)
    const priorBalance = customer.currentBalance || 0;
    const netAmountDue = Number((billableProductAmount + priorBalance).toFixed(2));
    const paid = Number(amountPaid ?? 0);
    if (!Number.isFinite(paid) || paid < 0 || paid > netAmountDue) {
      return res.status(400).json({ error: 'Amount paid must be between zero and the invoice amount due.' });
    }
    const selectedPaymentMethod = paymentMethod || 'Cash';
    if (paid > 0 && selectedPaymentMethod !== 'Cash' && !paymentReference?.trim()) return res.status(400).json({ error: 'Enter the GCash or bank check reference number.' });
    if (paid > 0 && selectedPaymentMethod === 'Check' && (!bankName?.trim() || !checkDate || !Number.isFinite(new Date(checkDate).getTime()))) return res.status(400).json({ error: 'Enter the bank name and date for this bank check.' });
    if (paid > 0 && paymentReference?.trim()) {
      const duplicatePayment = await prisma.paymentTransaction.findFirst({ where: { referenceNumber: paymentReference.trim() } });
      if (duplicatePayment) return res.status(409).json({ error: `Payment reference "${paymentReference}" was already recorded previously.` });
    }
    // A bank check is recorded as received but does not reduce the customer balance until it clears.
    const clearedPaymentAmount = selectedPaymentMethod === 'Check' ? 0 : paid;
    const balanceRemaining = Math.max(0, Number((netAmountDue - clearedPaymentAmount).toFixed(2)));
    const paymentStatus = balanceRemaining <= 0 ? 'Paid' : clearedPaymentAmount > 0 ? 'Partial' : 'Unpaid';

    const invoiceNumber = `OR-${stop.storeName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async tx => {
      if (paid > 0 && paymentReference?.trim()) {
        const duplicate = await tx.paymentTransaction.findFirst({ where: { referenceNumber: paymentReference.trim() } });
        if (duplicate) throw new Error('DUPLICATE_PAYMENT_REFERENCE');
      }
      for (const itemUpdate of itemUpdates) {
        await tx.deliveryItem.update({ where: { id: itemUpdate.id }, data: itemUpdate.data });
      }
      if (boDiscrepanciesToCreate.length) await tx.boDiscrepancy.createMany({ data: boDiscrepanciesToCreate });

      const invoice = await tx.customerInvoice.upsert({
        where: { deliveryStopId: stop.id },
        update: {
          billableProductAmount, priorBalance, netAmountDue, totalPaid: clearedPaymentAmount, balanceRemaining,
          paymentStatus,
          collectorName: stop.deliveryRun.collector, customerSignature: recipientName?.trim() || null, notes,
        },
        create: {
          invoiceNumber, deliveryStopId: stop.id, customerId: stop.customerId, storeName: stop.storeName,
          invoiceDate: new Date(), billableProductAmount, otherCharges: 0, approvedDiscounts: 0,
          priorBalance, netAmountDue, totalPaid: clearedPaymentAmount, balanceRemaining,
          paymentStatus,
          collectorName: stop.deliveryRun.collector, customerSignature: recipientName?.trim() || null, notes,
        },
      });

      if (paid > 0) {
        await tx.paymentTransaction.create({
          data: {
            invoiceId: invoice.id, customerId: stop.customerId, amount: paid,
            paymentMethod: selectedPaymentMethod, referenceNumber: paymentReference?.trim() || null,
            bankName: bankName?.trim() || null, checkDate: checkDate ? new Date(checkDate) : null,
            checkStatus: selectedPaymentMethod === 'Check' ? 'Pending' : 'Cleared',
            collectedBy: stop.deliveryRun.collector || req.user?.name || 'Collector',
            notes: `Collected during delivery stop at ${stop.storeName}`,
          },
        });
      }
      await tx.customer.update({ where: { id: stop.customerId }, data: { currentBalance: balanceRemaining } });
      const updatedStop = await tx.deliveryStop.update({
        where: { id: stop.id },
        data: { status: 'Delivered', recipientName: recipientName?.trim() || null, deliveredAt: new Date(), notes },
        include: { items: true, invoice: { include: { payments: true } } },
      });
      const remainingStops = await tx.deliveryStop.count({ where: { deliveryRunId: stop.deliveryRunId, status: { in: ['Pending', 'In Progress'] } } });
      if (remainingStops === 0) await tx.deliveryRun.update({ where: { id: stop.deliveryRunId }, data: { status: 'Delivered', completedAt: new Date() } });
      return { invoice, updatedStop };
    });

    await recordAudit('Deliver Stop', 'Delivery', req.user?.name || 'Collector', {
      stopId: stop.id,
      store: stop.storeName,
      netAmountDue,
      amountPaid: paid,
      balanceRemaining,
    });

    res.json({
      success: true,
      stop: result.updatedStop,
      invoice: result.invoice,
    });
  } catch (err: any) {
    if (err.message === 'DUPLICATE_PAYMENT_REFERENCE') return res.status(409).json({ error: `Payment reference "${paymentReference}" was already recorded previously.` });
    res.status(500).json({ error: err.message });
  }
});

export default router;
