import { Router, Response } from 'express';
import prisma from '../db.js';
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
        totalBillableAmount += stop.invoice.netAmountDue;
        totalOutstandingCredit += stop.invoice.balanceRemaining;

        for (const pay of stop.invoice.payments) {
          if (pay.paymentMethod === 'Cash') {
            expectedCash += pay.amount;
          } else if (pay.paymentMethod === 'GCash') {
            totalGcash += pay.amount;
          } else if (pay.paymentMethod === 'Bank Transfer') {
            totalBankTransfer += pay.amount;
          } else if (pay.paymentMethod === 'Check') {
            totalChecks += pay.amount;
            if (pay.checkStatus === 'Cleared') {
              totalClearedChecks += pay.amount;
            } else {
              totalPendingChecks += pay.amount;
            }
          }
        }
      }
    }

    const clearedFundsTotal = expectedCash + totalGcash + totalBankTransfer + totalClearedChecks;

    const existing = run.reconciliation;
    const actualCash = existing ? existing.actualCashCounted : expectedCash;
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

async function finalizeReconciledRun(runId: string, staffName: string) {
  const run = await prisma.deliveryRun.findUnique({ where: { id: runId }, include: { stops: { include: { items: true } } } });
  if (!run) throw new Error('Delivery run not found.');
  if (run.status === 'Reconciled') return;

  await prisma.$transaction(async tx => {
    const movements = new Map<string, { name: string; loaded: number; intact: number; bo: number }>();
    for (const stop of run.stops) {
      for (const item of stop.items) {
        const movement = movements.get(item.productId) || { name: item.productName, loaded: 0, intact: 0, bo: 0 };
        movement.loaded += item.loadedQty;
        movement.intact += item.intactReturnedQty;
        movement.bo += item.boRefusedQty;
        movements.set(item.productId, movement);
      }
    }

    for (const [productId, movement] of movements) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          reservedStock: { decrement: movement.loaded },
          stock: { increment: movement.intact },
          quarantineStock: { increment: movement.bo },
        },
      });
      const ledgerEntries: any[] = [];
      if (movement.intact > 0) ledgerEntries.push({ productId, productName: product.name, movementType: 'Intact Return', changeQty: movement.intact, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: run.runNumber, staffName, notes: `Verified intact return and backload from ${run.runNumber}` });
      if (movement.bo > 0) ledgerEntries.push({ productId, productName: product.name, movementType: 'BO Quarantine', changeQty: movement.bo, runningSaleable: updated.stock, runningQuarantine: updated.quarantineStock, reference: run.runNumber, staffName, notes: `BO returned and quarantined from ${run.runNumber}` });
      if (ledgerEntries.length) await tx.inventoryLedger.createMany({ data: ledgerEntries });
    }

    const deliveredBookingIds = run.stops.filter(stop => stop.status === 'Delivered').map(stop => stop.bookingId);
    const backloadBookingIds = run.stops.filter(stop => stop.status === 'Failed').map(stop => stop.bookingId);
    if (deliveredBookingIds.length) await tx.booking.updateMany({ where: { id: { in: deliveredBookingIds } }, data: { status: 'Delivered' } });
    if (backloadBookingIds.length) await tx.booking.updateMany({ where: { id: { in: backloadBookingIds } }, data: { status: 'Backload' } });
    await tx.deliveryRun.update({ where: { id: runId }, data: { status: 'Reconciled', reconciledAt: new Date() } });
  });
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
    if (route) runWhere.route = { contains: route, mode: 'insensitive' };
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
        totalOutstandingCredit += stop.invoice.balanceRemaining;
        for (const pay of stop.invoice.payments) {
          if (pay.paymentMethod === 'Cash') {
            expectedCash += pay.amount;
          } else if (pay.paymentMethod === 'GCash') {
            totalGcash += pay.amount;
          } else if (pay.paymentMethod === 'Bank Transfer') {
            totalBankTransfer += pay.amount;
          } else if (pay.paymentMethod === 'Check') {
            totalChecks += pay.amount;
            if (pay.checkStatus === 'Cleared') {
              totalClearedChecks += pay.amount;
            }
          }
        }
      }
    }

    const actualCash = Number(actualCashCounted) || 0;
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
    const reconciliation = await prisma.routeReconciliation.upsert({
      where: { deliveryRunId: run.id },
      update: {
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
      },
      create: {
        deliveryRunId: run.id,
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
      },
    });

    if (status === 'Approved') await finalizeReconciledRun(run.id, req.user?.name || 'Staff');
    await recordAudit('Route Reconciliation', 'Delivery Reconciliation', req.user?.name || 'Staff', {
      runNumber: run.runNumber,
      cashVariance,
      status,
    });

    res.json({
      success: true,
      reconciliation,
      status,
    });
  } catch (err: any) {
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
    const existing = await prisma.routeReconciliation.findUnique({ where: { id: recId }, include: { deliveryRun: true } });
    if (!existing) return res.status(404).json({ error: 'Reconciliation record not found.' });
    if (existing.status !== 'Pending Approval') return res.status(409).json({ error: 'Only reconciliations pending approval can be approved.' });
    if (existing.deliveryRun.status !== 'Delivered') return res.status(409).json({ error: 'The delivery run must be complete before approval.' });
    const rec = await prisma.routeReconciliation.update({
      where: { id: recId },
      data: {
        status: 'Approved',
        approvedBy: req.user?.name || 'Dealer Admin',
        approvedAt: new Date(),
        discrepancyReason: adminNotes ? `Admin Approval: ${adminNotes}` : undefined,
      },
    });

    await finalizeReconciledRun(rec.deliveryRunId, req.user?.name || 'Admin');

    await recordAudit('Approve Reconciliation', 'Delivery Reconciliation', req.user?.name || 'Admin', {
      recId,
      variance: rec.cashVariance,
    });

    res.json({ success: true, reconciliation: rec });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export default router;
