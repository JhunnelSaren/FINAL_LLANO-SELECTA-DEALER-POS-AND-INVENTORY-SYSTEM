import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';
import { calculateDeliveryAmounts, validateDeliveryQuantities } from '../delivery-calculations.js';

const router = Router();

class DeliveryWorkflowError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

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
    const now = new Date();
    const failedStop = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "DeliveryRun" WHERE "id" = (SELECT "deliveryRunId" FROM "DeliveryStop" WHERE "id" = ${stopId}) FOR UPDATE`;
      const stop = await tx.deliveryStop.findUnique({ where: { id: stopId }, include: { items: true, deliveryRun: true } });
      if (!stop) throw new DeliveryWorkflowError(404, 'Delivery stop not found.');
      if (stop.deliveryRun.status !== 'In Transit') throw new DeliveryWorkflowError(409, 'Backloads can only be recorded for a dispatched run.');
      if (stop.status !== 'Pending' && stop.status !== 'In Progress') {
        throw new DeliveryWorkflowError(409, `This stop has already been recorded as ${stop.status}.`);
      }

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
    if (err instanceof DeliveryWorkflowError) return res.status(err.statusCode).json({ error: err.message });
    console.error('Failed to record delivery backload:', err);
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
    const recipient = typeof recipientName === 'string' ? recipientName.trim() : '';
    if (!recipient) throw new DeliveryWorkflowError(400, 'Enter who received the delivery.');
    if (!['Cash', 'GCash', 'Check', 'Bank Transfer'].includes(paymentMethod)) {
      throw new DeliveryWorkflowError(400, 'Choose Cash, GCash, Bank Transfer, or Check for payment.');
    }
    if (amountPaid === undefined || amountPaid === null || amountPaid === '') {
      throw new DeliveryWorkflowError(400, 'Enter the amount collected. Enter 0 if no payment was collected.');
    }
    const paid = Number(amountPaid);
    if (!Number.isFinite(paid) || paid < 0 || Math.round(paid * 100) !== paid * 100) {
      throw new DeliveryWorkflowError(400, 'Amount collected must be a nonnegative amount with no more than two decimal places.');
    }
    const reference = typeof paymentReference === 'string' ? paymentReference.trim() : '';
    const bank = typeof bankName === 'string' ? bankName.trim() : '';
    const checkDateValue = typeof checkDate === 'string' ? checkDate.trim() : '';
    if (paid > 0 && paymentMethod !== 'Cash' && !reference) {
      throw new DeliveryWorkflowError(400, `Enter the ${paymentMethod} payment reference.`);
    }
    if (paid > 0 && paymentMethod === 'Check'
      && (!bank || !checkDateValue || !Number.isFinite(new Date(checkDateValue).getTime()))) {
      throw new DeliveryWorkflowError(400, 'Enter the bank name and a valid check date.');
    }
    if (!Array.isArray(deliveredLines)) {
      return res.status(400).json({ error: 'Enter delivery results for every loaded product.' });
    }
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "DeliveryRun" WHERE "id" = (SELECT "deliveryRunId" FROM "DeliveryStop" WHERE "id" = ${stopId}) FOR UPDATE`;
      const stop = await tx.deliveryStop.findUnique({
        where: { id: stopId },
        include: { deliveryRun: true, items: true, invoice: true },
      });
      if (!stop) throw new DeliveryWorkflowError(404, 'Delivery stop not found.');
      if (stop.deliveryRun.status !== 'In Transit') {
        throw new DeliveryWorkflowError(409, 'Delivery results can only be recorded for a dispatched run.');
      }
      if (stop.status !== 'Pending' && stop.status !== 'In Progress') {
        throw new DeliveryWorkflowError(409, `This stop has already been recorded as ${stop.status}.`);
      }
      if (stop.invoice) throw new DeliveryWorkflowError(409, 'This stop already has an invoice and cannot be recorded again.');
      if (deliveredLines.length !== stop.items.length) {
        throw new DeliveryWorkflowError(400, 'Enter delivery results for every loaded product.');
      }

      await tx.$queryRaw`SELECT "id" FROM "customers" WHERE "id" = ${stop.customerId} FOR UPDATE`;
      const customer = await tx.customer.findUnique({ where: { id: stop.customerId } });
      if (!customer) throw new DeliveryWorkflowError(404, 'Customer not found.');

      const submittedLines = new Map<string, any>();
      for (const line of deliveredLines) {
        const itemId = String(line?.id || line?.productId || '');
        if (!itemId || submittedLines.has(itemId)) {
          throw new DeliveryWorkflowError(400, 'Each loaded product must be recorded exactly once.');
        }
        submittedLines.set(itemId, line);
      }

      const itemUpdates: { id: string; acceptedQty: number; boRefusedQty: number; intactReturnedQty: number; notes: string | null }[] = [];
      const boDiscrepanciesToCreate: any[] = [];
      const amountLines: { acceptedQty: number; boRefusedQty: number; unitPrice: number }[] = [];

      for (const existingItem of stop.items) {
        const line = submittedLines.get(existingItem.id) || submittedLines.get(existingItem.productId);
        if (!line) throw new DeliveryWorkflowError(400, 'Each loaded product must be recorded exactly once.');

        const quantities = {
          acceptedQty: line.acceptedQty,
          boRefusedQty: line.boRefusedQty,
        };
        const quantityError = validateDeliveryQuantities(existingItem.productName, existingItem.loadedQty, quantities);
        if (quantityError) throw new DeliveryWorkflowError(400, quantityError);

        const acceptedQty = quantities.acceptedQty as number;
        const boRefusedQty = quantities.boRefusedQty as number;
        const intactReturnedQty = existingItem.loadedQty - acceptedQty;
        const unitPrice = Number(existingItem.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new DeliveryWorkflowError(400, `The catalog price for ${existingItem.productName} is invalid.`);
        }

        itemUpdates.push({
          id: existingItem.id,
          acceptedQty,
          boRefusedQty,
          intactReturnedQty,
          notes: typeof line.notes === 'string' ? line.notes.trim() || null : null,
        });
        amountLines.push({ acceptedQty, boRefusedQty, unitPrice });

        if (boRefusedQty > 0) {
          const boCredit = Number((boRefusedQty * unitPrice).toFixed(2));
          boDiscrepanciesToCreate.push({
            id: `BO-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
            customerId: customer.id,
            deliveryRef: stop.deliveryRun.runNumber,
            storeName: stop.storeName,
            productId: existingItem.productId,
            productName: existingItem.productName,
            category: existingItem.category || 'Unspecified',
            quantity: boRefusedQty,
            unitPrice,
            totalDeduction: boCredit,
            reason: `BO/melted refused by ${stop.storeName} and brought back in van`,
            reportedBy: stop.deliveryRun.collector || req.user?.name || 'Collector',
            disposition: 'Refunded',
            dispositionBy: 'SELECTA',
            dispositionAt: new Date(),
            notes: `BO damaged goods deduction of ₱${boCredit.toFixed(2)} was applied to the delivery bill for run ${stop.deliveryRun.runNumber}.`,
          });
        }
      }

      if (submittedLines.size !== stop.items.length) {
        throw new DeliveryWorkflowError(400, 'A submitted product does not belong to this delivery stop.');
      }

      const totals = calculateDeliveryAmounts(
        amountLines,
        Number(customer.currentBalance) || 0,
        paymentMethod,
        paid,
      );
      if (paid > totals.totalAmountDue) {
        throw new DeliveryWorkflowError(400, 'Amount collected cannot exceed the delivery bill plus the previous balance.');
      }
      if (paid > 0 && reference) {
        const duplicatePayment = await tx.paymentTransaction.findFirst({ where: { referenceNumber: reference } });
        if (duplicatePayment) throw new DeliveryWorkflowError(409, `Payment reference "${reference}" was already recorded previously.`);
      }

      for (const itemUpdate of itemUpdates) {
        await tx.deliveryItem.update({
          where: { id: itemUpdate.id },
          data: {
            acceptedQty: itemUpdate.acceptedQty,
            missingQty: 0,
            boRefusedQty: itemUpdate.boRefusedQty,
            intactReturnedQty: itemUpdate.intactReturnedQty,
            notes: itemUpdate.notes,
          },
        });
      }
      if (boDiscrepanciesToCreate.length) await tx.boDiscrepancy.createMany({ data: boDiscrepanciesToCreate });

      const invoice = await tx.customerInvoice.create({
        data: {
          invoiceNumber: `OR-${stop.storeName.slice(0, 3).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          deliveryStopId: stop.id,
          customerId: stop.customerId,
          storeName: stop.storeName,
          invoiceDate: new Date(),
          billableProductAmount: totals.finalProductBill,
          boDeductionAmount: totals.boDeductionAmount,
          otherCharges: 0,
          approvedDiscounts: 0,
          priorBalance: totals.previousBalance,
          netAmountDue: totals.totalAmountDue,
          totalPaid: totals.clearedPaymentAmount,
          balanceRemaining: totals.balanceRemaining,
          paymentStatus: totals.paymentStatus,
          collectorName: stop.deliveryRun.collector,
          customerSignature: recipient,
          notes: typeof notes === 'string' ? notes.trim() || null : null,
        },
      });

      if (paid > 0) {
        await tx.paymentTransaction.create({
          data: {
            invoiceId: invoice.id,
            customerId: stop.customerId,
            amount: paid,
            paymentMethod,
            referenceNumber: reference || null,
            bankName: bank || null,
            checkDate: paymentMethod === 'Check' ? new Date(checkDateValue) : null,
            checkStatus: paymentMethod === 'Check' ? 'Pending' : 'Cleared',
            collectedBy: stop.deliveryRun.collector || req.user?.name || 'Collector',
            notes: `Collected during delivery stop at ${stop.storeName}`,
          },
        });
      }

      await tx.customer.update({
        where: { id: stop.customerId },
        data: { currentBalance: totals.balanceRemaining },
      });
      const updatedStop = await tx.deliveryStop.update({
        where: { id: stop.id },
        data: {
          status: 'Delivered',
          recipientName: recipient,
          deliveredAt: new Date(),
          notes: typeof notes === 'string' ? notes.trim() || null : null,
        },
        include: { items: true, invoice: { include: { payments: true } } },
      });
      const remainingStops = await tx.deliveryStop.count({
        where: { deliveryRunId: stop.deliveryRunId, status: { in: ['Pending', 'In Progress'] } },
      });
      if (remainingStops === 0) {
        await tx.deliveryRun.update({ where: { id: stop.deliveryRunId }, data: { status: 'Delivered', completedAt: new Date() } });
      }

      return { invoice, updatedStop, totals };
    });

    await recordAudit('Deliver Stop', 'Delivery', req.user?.name || 'Collector', {
      stopId,
      netAmountDue: result.totals.totalAmountDue,
      amountPaid: result.totals.amountCollected,
      balanceRemaining: result.totals.balanceRemaining,
    });

    res.json({
      success: true,
      stop: result.updatedStop,
      invoice: result.invoice,
      totals: result.totals,
    });
  } catch (err: any) {
    if (err instanceof DeliveryWorkflowError) return res.status(err.statusCode).json({ error: err.message });
    console.error('Failed to record delivery and payment:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
