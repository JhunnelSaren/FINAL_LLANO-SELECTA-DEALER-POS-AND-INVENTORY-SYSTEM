import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../auth.js';
import { manilaDayRange, manilaMonthYear } from '../business-time.js';

const router = Router();

// GET /api/dashboard
router.get('/', authenticateToken, async (_req, res: Response) => {
  try {
    const today = new Date();
    const { start: startOfToday, end: endOfToday } = manilaDayRange(today);
    const currentMonthYear = manilaMonthYear(today);

    // 1. Today's Bookings and Deliveries
    const todayBookingsCount = await prisma.booking.count({
      where: {
        bookingDate: { gte: startOfToday, lte: endOfToday },
      },
    });
    const scheduledDeliveriesCount = await prisma.deliveryRun.count({
      where: {
        deliveryDate: { gte: startOfToday, lte: endOfToday },
      },
    });

    // 2. Bookings waiting for a delivery run
    const bookingsToPrepare = await prisma.booking.count({
      where: {
        status: 'Booked',
      },
    });
    const stockReceiptsToday = await prisma.stockReceiving.count({ where: { arrivalDate: { gte: startOfToday, lte: endOfToday } } });

    // 4. Products in stock and below minimum level
    const products = await prisma.product.findMany();
    const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
    const totalSaleableUnits = products.reduce((sum, p) => sum + p.stock, 0);

    // 5. Deliveries in progress and deliveries awaiting reconciliation
    const deliveriesInProgress = await prisma.deliveryRun.count({
      where: { status: 'In Transit' },
    });
    const deliveriesAwaitingReconciliation = await prisma.deliveryRun.count({
      where: { status: 'Delivered' },
    });

    // 6. Outstanding customer balances
    const customersWithBalance = await prisma.customer.findMany({
      where: { currentBalance: { gt: 0 } },
      select: { currentBalance: true },
    });
    const totalOutstandingBalance = customersWithBalance.reduce((sum, c) => sum + c.currentBalance, 0);

    // 7. Cash shortages, delivery discrepancies, pending approvals
    const pendingReconciliations = await prisma.routeReconciliation.findMany({
      where: { status: 'Pending Approval' },
      select: { cashVariance: true },
    });
    const pendingShortages = pendingReconciliations.filter((r) => r.cashVariance < 0);
    const pendingShortageAmount = pendingShortages.reduce((sum, r) => sum + Math.abs(r.cashVariance), 0);

    const pendingBoDiscrepancies = await prisma.boDiscrepancy.count({
      where: { disposition: 'Pending' },
    });

    // 8. Freezers due for monthly barcode verification
    const inFiveDays = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    const freezersDue = await prisma.freezer.findMany({
      where: {
        status: 'Active',
        OR: [
          { nextDueAt: { lte: inFiveDays } },
          { nextDueAt: null },
        ],
      },
      select: { id: true, serialNumber: true, barcode: true, assignedStoreName: true, nextDueAt: true },
    });

    // 9. Current month's Selecta POS quota
    let quota = await prisma.selectaPosQuota.findUnique({
      where: { monthYear: currentMonthYear },
      include: { entries: true },
    });

    if (!quota) {
      const settings = await prisma.systemSetting.findFirst();
      quota = await prisma.selectaPosQuota.create({
        data: {
          monthYear: currentMonthYear,
          targetAmount: settings?.defaultQuotaTarget || 1000000.00,
          recordedSales: 0.00,
        },
        include: { entries: true },
      });
    }

    const quotaTarget = quota.targetAmount;
    const quotaAchieved = quota.recordedSales;
    const quotaPercentage = quotaTarget > 0 ? Number(((quotaAchieved / quotaTarget) * 100).toFixed(1)) : 0;
    const quotaRemaining = Math.max(0, quotaTarget - quotaAchieved);

    // Recent operational activity
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });

    const recentRuns = await prisma.deliveryRun.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      metrics: {
        todayBookings: {
          count: todayBookingsCount,
          scheduledDeliveries: scheduledDeliveriesCount,
        },
        bookingsToPrepare,
        stockReceiptsToday,
        stockStatus: {
          totalSaleableUnits,
          lowStockCount: lowStockProducts.length,
          lowStockProducts: lowStockProducts.map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
          })),
        },
        deliveryStatus: {
          inProgress: deliveriesInProgress,
          awaitingReconciliation: deliveriesAwaitingReconciliation,
        },
        outstandingBalances: {
          totalAmount: totalOutstandingBalance,
          count: customersWithBalance.length,
        },
        discrepancies: {
          pendingApprovalsCount: pendingReconciliations.length,
          pendingShortageAmount,
          pendingBoCount: pendingBoDiscrepancies,
        },
        freezersVerification: {
          dueCount: freezersDue.length,
          freezers: freezersDue,
        },
        quota: {
          monthYear: currentMonthYear,
          target: quotaTarget,
          achieved: quotaAchieved,
          percentage: quotaPercentage,
          remaining: quotaRemaining,
        },
      },
      recentBookings,
      recentRuns,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
