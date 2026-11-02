import { Router, Response } from 'express';
import prisma from '../db.js';
import { Prisma } from '../../generated-prisma/index.js';
import { authenticateToken, requireRole, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Helper to calculate & get reconciliation for a run
async function getRunReconciliation(runId: string, res: Response) {
  try {
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        stops: {
          include: {
            items: true,
            invoice: {
              include: { payments: true },
            },
          },
        },
        reconciliation: true,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Delivery run not found.' });
    }
    let totalLoadedUnits = 0;
    let totalDeliveredAccepted = 0;
    let totalIntactReturned = 0;
    let totalBoReturned = 0;
    let totalMissingUnaccounted = 0;

    let totalBillableAmount = 0;
    let expectedCash = 0;
    let totalGcash = 0;
    let totalBankTransfer = 0;
    let totalChecks = 0;
    let totalClearedChecks = 0;
    let totalPendingChecks = 0;
    let totalOutstandingCredit = 0;

    for (const stop of run.stops) {
      for (const item of stop.items) {
        totalLoadedUnits += item.loadedQty;
        totalDeliveredAccepted += item.acceptedQty;
        totalIntactReturned += item.intactReturnedQty;
        totalBoReturned += item.boRefusedQty;
        totalMissingUnaccounted += item.missingQty;
      }

      if (stop.invoice) {
        totalBillableAmount += Number(stop.invoice.netAmountDue);
        const deliveryPayments = stop.deliveredAt
          ? stop.invoice.payments.filter(pay => pay.recordedAt <= stop.deliveredAt!)
          : stop.invoice.payments;
        const clearedOnDelivery = deliveryPayments
          .filter(pay => pay.paymentMethod !== 'Check')
          .reduce((sum, pay) => sum + Number(pay.amount), 0);
        totalOutstandingCredit += stop.deliveredAt
          ? Math.max(0, Number(stop.invoice.netAmountDue) - clearedOnDelivery)
          : Number(stop.invoice.balanceRemaining);

        for (const pay of deliveryPayments) {
          if (pay.paymentMethod === 'Cash') {
            expectedCash += Number(pay.amount);
          } else if (pay.paymentMethod === 'GCash') {
            totalGcash += Number(pay.amount);
          } else if (pay.paymentMethod === 'Bank Transfer') {
            totalBankTransfer += Number(pay.amount);
          } else if (pay.paymentMethod === 'Check') {
            totalChecks += Number(pay.amount);
            if (pay.checkStatus === 'Cleared') {
              totalClearedChecks += Number(pay.amount);
            } else {
              totalPendingChecks += Number(pay.amount);
            }
          }
        }
      }
    }

    const clearedFundsTotal = expectedCash + totalGcash + totalBankTransfer + totalClearedChecks;

    const existing = run.reconciliation;
    const actualCash = existing ? Number(existing.actualCashCounted) : expectedCash;
    const cashVariance = Number((actualCash - expectedCash).toFixed(2));

    res.json({
      runId: run.id,
      runNumber: run.runNumber,
      route: run.route,
      deliveryDate: run.deliveryDate,
      driver: run.driver,
      collector: run.collector,
      status: existing ? existing.status : 'Draft',
      id: existing ? existing.id : undefined,
      expectedCash,
      actualCashCounted: actualCash,
      cashVariance,
      totalClearedFunds: clearedFundsTotal,
      run,
      summary: {
        totalLoadedUnits,
        totalDeliveredAccepted,
        totalIntactReturned,
        totalBoReturned,
        totalMissingUnaccounted,
        totalBillableAmount,
        expectedCash,
        actualCashCounted: actualCash,
        cashVariance,
        totalGcash,
        totalBankTransfer,
        totalChecks,
        totalClearedChecks,
        totalPendingChecks,
        clearedFundsTotal,
        totalOutstandingCredit,
        existingReconciliation: run.reconciliation,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

class ReconciliationError extends Error {
  constructor(message: string, readonly statusCode: number = 409) {
    super(message);
  }
}

async function lockRunForCloseout(tx: Prisma.TransactionClient, runId: string) {
  const [run] = await tx.$queryRaw<Array<{ status: string }>>`
    SELECT status FROM DeliveryRun WHERE id = ${runId} FOR UPDATE
  `;
  if (!run) throw new ReconciliationError('Delivery run not found.', 404);
  return run;
}

async function finalizeReconciledRun(tx: Prisma.TransactionClient, runId: string, staffName: string) {
  const run = await tx.deliveryRun.findUnique({ where: { id: runId }, include: { stops: { include: { items: true } } } });
  if (!run) throw new ReconciliationError('Delivery run not found.', 404);
  if (run.status === 'Reconciled') return;
  if (run.status !== 'Delivered') throw new ReconciliationError('Only a completed delivery run can be reconciled.');
  if (run.stops.some(stop => stop.status === 'Pending' || stop.status === 'In Progress')) {
    throw new ReconciliationError('Record every delivery or backload before reconciling this run.');
  }

  // Older dispatched runs already deducted the load from stock at dispatch.
  const legacyDispatch = await tx.inventoryLedger.findFirst({
    where: { reference: run.runNumber, movementType: 'Dispatch' },
    select: { id: true },
  });
  const movements = new Map<string, { loaded: number; accepted: number; missing: number; intact: number; bo: number }>();
  for (const stop of run.stops) {
    for (const item of stop.items) {
      const quantities = [item.loadedQty, item.acceptedQty, item.missingQty, item.intactReturnedQty, item.boRefusedQty];
      if (quantities.some(value => !Number.isInteger(value) || value < 0)
        || item.acceptedQty + item.missingQty + item.intactReturnedQty + item.boRefusedQty !== item.loadedQty) {
        throw new ReconciliationError(`Loaded quantities for ${item.productName} at ${stop.storeName} do not balance. Refresh the run and correct its delivery record.`);
      }
      const movement = movements.get(item.productId) || { loaded: 0, accepted: 0, missing: 0, intact: 0, bo: 0 };
      movement.loaded += item.loadedQty;
      movement.accepted += item.acceptedQty;
      movement.missing += item.missingQty;
      movement.intact += item.intactReturnedQty;
      movement.bo += item.boRefusedQty;
      movements.set(item.productId, movement);
    }
  }

  // Lock inventory in a stable order so simultaneous run closeouts do not race.
  for (const productId of [...movements.keys()].sort()) {
    const movement = movements.get(productId)!;
    const [product] = await tx.$queryRaw<Array<{ id: string; name: string; stock: number; reservedStock: number }>>`
      SELECT id, name, stock, reservedStock FROM product WHERE id = ${productId} FOR UPDATE
    `;
    if (!product) throw new ReconciliationError(`Product ${productId} no longer exists. Inventory closeout was not applied.`);

    if (legacyDispatch) {
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: movement.intact }, quarantineStock: { increment: movement.bo } },
      });
      const legacyEntries: any[] = [];
      if (movement.intact > 0) legacyEntries.push({ productId, productName: product.name, movementType: 'Intact Return', changeQty: movement.intact, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: run.runNumber, staffName, notes: `Verified intact return and backload from ${run.runNumber}` });
      if (movement.bo > 0) legacyEntries.push({ productId, productName: product.name, movementType: 'BO Quarantine', changeQty: movement.bo, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: run.runNumber, staffName, notes: `BO returned and quarantined from ${run.runNumber}` });
      if (legacyEntries.length) await tx.inventoryLedger.createMany({ data: legacyEntries });
    } else {
      const saleableReduction = movement.accepted + movement.missing + movement.bo;
      if (product.reservedStock < movement.loaded) {
        throw new ReconciliationError(`Reserved inventory for ${product.name} is lower than the loaded quantity. Inventory closeout was not applied.`);
      }
      if (product.stock < saleableReduction) {
        throw new ReconciliationError(`Saleable inventory for ${product.name} is insufficient for closeout. Inventory closeout was not applied.`);
      }
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          reservedStock: { decrement: movement.loaded },
          stock: { decrement: saleableReduction },
          quarantineStock: { increment: movement.bo },
        },
      });
      await tx.inventoryLedger.create({
        data: {
          productId,
          productName: product.name,
          movementType: 'Delivery Closeout',
          changeQty: -saleableReduction,
          runningSaleable: updated.stock,
          runningQuarantine: updated.quarantineStock,
          reference: run.runNumber,
          staffName,
          notes: `Accepted ${movement.accepted}, missing ${movement.missing}, BO quarantined ${movement.bo}, intact returned ${movement.intact}; reserved ${movement.loaded} units released from van.`,
        },
      });
    }
  }

  const deliveredBookingIds = run.stops.filter(stop => stop.status === 'Delivered').map(stop => stop.bookingId);
  const backloadBookingIds = run.stops.filter(stop => stop.status === 'Failed').map(stop => stop.bookingId);
  if (deliveredBookingIds.length) await tx.booking.updateMany({ where: { id: { in: deliveredBookingIds } }, data: { status: 'Delivered' } });
  if (backloadBookingIds.length) await tx.booking.updateMany({ where: { id: { in: backloadBookingIds } }, data: { status: 'Backload' } });
  await tx.deliveryRun.update({ where: { id: runId }, data: { status: 'Reconciled', reconciledAt: new Date() } });
}

// GET /api/reconciliation (list or by query ?runId=)
router.get('/', authenticateToken, async (req, res: Response) => {
  const { runId } = req.query;
  if (runId) {
    return getRunReconciliation(String(runId), res);
  }
  try {
    const runWhere: any = {};
    const route = String(req.query.route || '').trim();
    if (route) runWhere.route = { contains: route };
    const startValue = String(req.query.startDate || req.query.dateFrom || '').trim();
    const endValue = String(req.query.endDate || req.query.dateTo || '').trim();
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startValue) ? new Date(`${startValue}T00:00:00+08:00`) : undefined;
    const endDate = /^\d{4}-\d{2}-\d{2}$/.test(endValue) ? new Date(`${endValue}T23:59:59.999+08:00`) : undefined;
    if (startDate || endDate) runWhere.deliveryDate = { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) };
    const records = await prisma.routeReconciliation.findMany({
      where: Object.keys(runWhere).length ? { deliveryRun: { is: runWhere } } : undefined,
      include: { deliveryRun: true },
      orderBy: { reconciliationDate: 'desc' },
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reconciliation/:runId (Get reconciliation draft calculations)
router.get('/:runId', authenticateToken, async (req, res: Response) => {
  return getRunReconciliation(req.params.runId, res);
});

// POST /api/reconciliation (submit with deliveryRunId in body)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const runId = req.body.deliveryRunId || req.body.runId;
  if (!runId) {
    return res.status(400).json({ error: 'deliveryRunId is required.' });
  }
  req.params = { runId };
  if (req.body.actualCash !== undefined && req.body.actualCashCounted === undefined) {
    req.body.actualCashCounted = req.body.actualCash;
  }
  return handlePostReconciliation(req, res);
});

// POST /api/reconciliation/:runId (Submit / Finalize reconciliation)
router.post('/:runId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  return handlePostReconciliation(req, res);
});

async function handlePostReconciliation(req: AuthenticatedRequest, res: Response) {
  const { runId } = req.params;
  const {
    actualCashCounted,
    discrepancyReason,
    approveException,
    notes,
  } = req.body;
  const submittedCash = actualCashCounted ?? req.body.actualCash;
  const hasSubmittedCash = submittedCash !== undefined && submittedCash !== null && submittedCash !== '';
  const parsedCash = hasSubmittedCash ? Number(submittedCash) : null;
  if (parsedCash !== null && (!Number.isFinite(parsedCash) || parsedCash < 0
    || Math.abs(parsedCash * 100 - Math.round(parsedCash * 100)) >= 0.000001)) {
    return res.status(400).json({ error: 'Enter a valid cash amount of zero or more with up to two decimal places.' });
  }

  try {
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        stops: {
          include: {
            items: true,
            invoice: { include: { payments: true } },
          },
        },
        reconciliation: true,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Delivery run not found.' });
    }
    if (run.status !== 'Delivered') return res.status(409).json({ error: 'Only a completed delivery run can be reconciled.' });
    if (run.stops.some(stop => stop.status === 'Pending' || stop.status === 'In Progress')) return res.status(409).json({ error: 'Record every delivery or backload before reconciling this run.' });

    let totalLoadedUnits = 0;
    let totalDeliveredAccepted = 0;
    let totalIntactReturned = 0;
    let totalBoReturned = 0;
    let totalMissingUnaccounted = 0;

    let expectedCash = 0;
    let totalGcash = 0;
    let totalBankTransfer = 0;
    let totalChecks = 0;
    let totalClearedChecks = 0;
    let totalOutstandingCredit = 0;

    for (const stop of run.stops) {
      for (const item of stop.items) {
        totalLoadedUnits += item.loadedQty;
        totalDeliveredAccepted += item.acceptedQty;
        totalIntactReturned += item.intactReturnedQty;
        totalBoReturned += item.boRefusedQty;
        totalMissingUnaccounted += item.missingQty;

      }

      if (stop.invoice) {
        const deliveryPayments = stop.deliveredAt
          ? stop.invoice.payments.filter(pay => pay.recordedAt <= stop.deliveredAt!)
          : stop.invoice.payments;
        const clearedOnDelivery = deliveryPayments
          .filter(pay => pay.paymentMethod !== 'Check')
          .reduce((sum, pay) => sum + Number(pay.amount), 0);
        totalOutstandingCredit += stop.deliveredAt
          ? Math.max(0, Number(stop.invoice.netAmountDue) - clearedOnDelivery)
          : Number(stop.invoice.balanceRemaining);
        for (const pay of deliveryPayments) {
          if (pay.paymentMethod === 'Cash') {
            expectedCash += Number(pay.amount);
          } else if (pay.paymentMethod === 'GCash') {
            totalGcash += Number(pay.amount);
          } else if (pay.paymentMethod === 'Bank Transfer') {
            totalBankTransfer += Number(pay.amount);
          } else if (pay.paymentMethod === 'Check') {
            totalChecks += Number(pay.amount);
            if (pay.checkStatus === 'Cleared') {
              totalClearedChecks += Number(pay.amount);
            }
          }
        }
      }
    }

    const actualCash = parsedCash === null ? Number(expectedCash.toFixed(2)) : Number(parsedCash.toFixed(2));
    // Cash Variance = actual cash counted - expected cash
    const cashVariance = Number((actualCash - expectedCash).toFixed(2));
    const totalClearedFunds = Number((actualCash + totalGcash + totalBankTransfer + totalClearedChecks).toFixed(2));

    // Determine status
    let status = 'Approved';
    if (cashVariance !== 0 || totalMissingUnaccounted > 0) {
      if (req.user?.role === 'Admin' && approveException) {
        status = 'Approved';
      } else {
        status = 'Pending Approval';
      }
    }

    // Upsert RouteReconciliation
    const transactionResult = await prisma.$transaction(async tx => {
      const lockedRun = await lockRunForCloseout(tx, run.id);
      if (lockedRun.status === 'Reconciled') {
        const existing = await tx.routeReconciliation.findUnique({ where: { deliveryRunId: run.id } });
        if (!existing) throw new Error('The reconciled run has no reconciliation record.');
        return { reconciliation: existing, status: existing.status };
      }
      if (lockedRun.status !== 'Delivered') throw new ReconciliationError('Only a completed delivery run can be reconciled.');
      const existing = await tx.routeReconciliation.findUnique({ where: { deliveryRunId: run.id } });
      if (existing?.status === 'Approved') {
        await finalizeReconciledRun(tx, run.id, req.user?.name || 'Staff');
        return { reconciliation: existing, status: existing.status };
      }
      if (existing) throw new ReconciliationError('This run already has a reconciliation awaiting Admin review.');

      const values = {
        reconciliationDate: new Date(),
        totalLoadedUnits,
        totalDeliveredAccepted,
        totalIntactReturned,
        totalBoReturned,
        totalMissingUnaccounted,
        expectedCash,
        actualCashCounted: actualCash,
        cashVariance,
        totalGcash,
        totalBankTransfer,
        totalChecks,
        totalClearedFunds,
        outstandingCredit: totalOutstandingCredit,
        discrepancyReason: discrepancyReason || notes || null,
        status,
        approvedBy: status === 'Approved' ? req.user?.name || 'Dealer Admin' : null,
        approvedAt: status === 'Approved' ? new Date() : null,
      };
      const reconciliation = await tx.routeReconciliation.upsert({
        where: { deliveryRunId: run.id },
        update: values,
        create: { deliveryRunId: run.id, ...values },
      });
      if (status === 'Approved') await finalizeReconciledRun(tx, run.id, req.user?.name || 'Staff');
      return { reconciliation, status };
    });

    await recordAudit('Route Reconciliation', 'Delivery Reconciliation', req.user?.name || 'Staff', {
      runNumber: run.runNumber,
      cashVariance,
      status: transactionResult.status,
    });

    res.json({
      success: true,
      reconciliation: transactionResult.reconciliation,
      status: transactionResult.status,
    });
  } catch (err: any) {
    if (err instanceof ReconciliationError) return res.status(err.statusCode).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/reconciliation/:recId/approve (Admin approval)
router.post('/:recId/approve', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  return handleApproveReconciliation(req, res);
});

// POST /api/reconciliation/approve/:recId (Admin approval alias)
router.post('/approve/:recId', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  return handleApproveReconciliation(req, res);
});

async function handleApproveReconciliation(req: AuthenticatedRequest, res: Response) {
  const { recId } = req.params;
  const { adminNotes } = req.body;
  try {
    const rec = await prisma.$transaction(async tx => {
      const reference = await tx.routeReconciliation.findUnique({ where: { id: recId }, select: { deliveryRunId: true } });
      if (!reference) throw new ReconciliationError('Reconciliation record not found.', 404);
      const lockedRun = await lockRunForCloseout(tx, reference.deliveryRunId);
      if (lockedRun.status !== 'Delivered') throw new ReconciliationError('The delivery run must be complete before approval.');
      const existing = await tx.routeReconciliation.findUnique({ where: { id: recId } });
      if (!existing) throw new ReconciliationError('Reconciliation record not found.', 404);
      if (existing.status !== 'Pending Approval') throw new ReconciliationError('Only reconciliations pending approval can be approved.');
      const approved = await tx.routeReconciliation.update({
        where: { id: recId },
        data: {
          status: 'Approved',
          approvedBy: req.user?.name || 'Dealer Admin',
          approvedAt: new Date(),
          discrepancyReason: adminNotes ? `Admin Approval: ${adminNotes}` : undefined,
        },
      });
      await finalizeReconciledRun(tx, approved.deliveryRunId, req.user?.name || 'Admin');
      return approved;
    });

    await recordAudit('Approve Reconciliation', 'Delivery Reconciliation', req.user?.name || 'Admin', {
      recId,
      variance: rec.cashVariance,
    });

    res.json({ success: true, reconciliation: rec });
  } catch (err: any) {
    if (err instanceof ReconciliationError) return res.status(err.statusCode).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
}

export default router;
