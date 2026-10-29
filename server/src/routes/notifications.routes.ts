import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../auth.js';

const router = Router();

router.get('/', authenticateToken, async (_req, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [runs, bookings, products, receipts, reconciliations, pendingBo, recentActivity] = await Promise.all([
      prisma.deliveryRun.findMany({
        where: { status: { in: ['Prepared', 'In Transit', 'Delivered', 'Reconciled'] } },
        include: { stops: true, reconciliation: true },
        orderBy: { createdAt: 'desc' }, take: 25,
      }),
      prisma.booking.findMany({ where: { status: 'Booked' }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.stockReceiving.findMany({ where: { arrivalDate: { gte: sevenDaysAgo } }, orderBy: { arrivalDate: 'desc' }, take: 20 }),
      prisma.routeReconciliation.findMany({ where: { status: 'Pending Approval' }, include: { deliveryRun: true }, orderBy: { reconciliationDate: 'desc' }, take: 25 }),
      prisma.boDiscrepancy.findMany({ where: { disposition: 'Pending' }, orderBy: { createdAt: 'desc' }, take: 25 }),
      prisma.auditLog.findMany({ where: { timestamp: { gte: sevenDaysAgo }, module: { not: 'Auth' } }, orderBy: { timestamp: 'desc' }, take: 50 }),
    ]);

    const notifications = [
      ...runs.filter(run => run.status === 'In Transit').map(run => ({ id: `run-${run.id}`, type: 'delivery', level: 'urgent', title: 'Delivery run in progress', message: `${run.area || run.route} · ${run.stops.length} store stop(s)`, createdAt: run.dispatchedAt || run.createdAt, module: 'orders-delivery' })),
      ...runs.filter(run => run.status === 'Prepared').map(run => ({ id: `prepared-${run.id}`, type: 'delivery', level: 'notice', title: 'Delivery run ready', message: `${run.area || run.route} · ${run.stops.length} store stop(s) waiting for dispatch`, createdAt: run.createdAt, module: 'orders-delivery' })),
      ...runs.filter(run => run.status === 'Delivered' || run.status === 'Reconciled').map(run => {
        const delivered = run.stops.filter(stop => stop.status === 'Delivered').length;
        const backloads = run.stops.filter(stop => stop.status === 'Failed').length;
        return { id: `completed-${run.id}`, type: 'delivery', level: 'info', title: 'Delivery run completed', message: `${run.area || run.route} · ${delivered} successful stop(s) · ${backloads} backload(s)`, createdAt: run.completedAt || run.createdAt, module: 'orders-delivery' };
      }),
      ...bookings.map(booking => ({ id: `booking-${booking.id}`, type: 'booking', level: 'notice', title: 'Booking waiting for a delivery run', message: `${booking.area} · ${booking.storeName} · ${booking.bookingNumber}`, createdAt: booking.createdAt, module: 'orders-delivery' })),
      ...products.filter(product => product.stock <= product.minStock).map(product => ({ id: `stock-${product.id}`, type: 'inventory', level: 'warning', title: 'Product stock is low', message: `${product.name}: ${product.stock} on hand; minimum is ${product.minStock}`, createdAt: product.updatedAt, module: 'inventory' })),
      ...receipts.map(receipt => ({ id: `receipt-${receipt.id}`, type: 'receiving', level: 'info', title: 'Freezer van stock received', message: `${receipt.poNumber} · ${receipt.arrivalDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, createdAt: receipt.arrivalDate, module: 'inventory' })),
      ...reconciliations.map(reconciliation => ({ id: `recon-${reconciliation.id}`, type: 'reconciliation', level: 'warning', title: 'Route collection record needs review', message: `${reconciliation.deliveryRun.runNumber} · ${reconciliation.deliveryRun.area || reconciliation.deliveryRun.route}`, createdAt: reconciliation.reconciliationDate, module: 'sales-reports' })),
      ...pendingBo.map(bo => ({ id: `bo-${bo.id}`, type: 'bo', level: 'warning', title: 'BO needs action', message: `${bo.storeName || 'Supplier'} · ${bo.productName} × ${bo.quantity} · ₱${bo.totalDeduction.toFixed(2)}`, createdAt: bo.createdAt, module: 'inventory' })),
      ...recentActivity.map(activity => ({ id: `activity-${activity.id}`, type: 'activity', level: 'info', title: activity.action, message: `${activity.module} · ${activity.user}`, createdAt: activity.timestamp, module: activity.module === 'Inventory' || activity.module === 'Stock Receiving' ? 'inventory' : 'orders-delivery' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 80);

    res.json({ notifications, unreadCount: notifications.filter(item => item.level === 'urgent' || item.level === 'warning').length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
