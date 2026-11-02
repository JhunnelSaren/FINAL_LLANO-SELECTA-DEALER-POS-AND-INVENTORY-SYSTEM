import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

type Notification = {
  id: string;
  type: string;
  level: 'urgent' | 'warning' | 'notice' | 'info';
  title: string;
  message: string;
  createdAt: Date;
  module: string;
};

async function buildNotifications(isAdmin: boolean): Promise<Notification[]> {
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
    prisma.auditLog.findMany({ where: { timestamp: { gte: sevenDaysAgo }, module: { not: 'Auth' } }, orderBy: { timestamp: 'desc' }, take: 300 }),
  ]);

  return [
    ...runs.filter(run => run.status === 'In Transit').map(run => ({ id: `run-${run.id}`, type: 'delivery', level: 'urgent' as const, title: 'Delivery run in progress', message: `${run.area || run.route} · ${run.stops.length} store stop(s)`, createdAt: run.dispatchedAt || run.createdAt, module: 'orders-delivery' })),
    ...runs.filter(run => run.status === 'Prepared').map(run => ({ id: `prepared-${run.id}`, type: 'delivery', level: 'notice' as const, title: 'Delivery run ready', message: `${run.area || run.route} · ${run.stops.length} store stop(s) waiting for dispatch`, createdAt: run.createdAt, module: 'orders-delivery' })),
    ...runs.filter(run => run.status === 'Delivered' || run.status === 'Reconciled').map(run => {
      const delivered = run.stops.filter(stop => stop.status === 'Delivered').length;
      const backloads = run.stops.filter(stop => stop.status === 'Failed').length;
      return { id: `completed-${run.id}`, type: 'delivery', level: 'info' as const, title: 'Delivery run completed', message: `${run.area || run.route} · ${delivered} successful stop(s) · ${backloads} backload(s)`, createdAt: run.completedAt || run.createdAt, module: 'orders-delivery' };
    }),
    ...bookings.map(booking => ({ id: `booking-${booking.id}`, type: 'booking', level: 'notice' as const, title: 'Booking waiting for a delivery run', message: `${booking.area} · ${booking.storeName} · ${booking.bookingNumber}`, createdAt: booking.createdAt, module: 'orders-delivery' })),
    ...products.filter(product => product.stock - product.reservedStock <= product.minStock).map(product => ({ id: `stock-${product.id}`, type: 'inventory', level: 'warning' as const, title: 'Product stock is low', message: `${product.name}: ${Math.max(0, product.stock - product.reservedStock)} available; minimum is ${product.minStock}`, createdAt: product.updatedAt, module: 'inventory' })),
    ...receipts.map(receipt => ({ id: `receipt-${receipt.id}`, type: 'receiving', level: 'info' as const, title: 'Freezer van stock received', message: `${receipt.poNumber} · ${receipt.arrivalDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, createdAt: receipt.arrivalDate, module: 'inventory' })),
    ...reconciliations.map(reconciliation => ({ id: `recon-${reconciliation.id}`, type: 'reconciliation', level: 'warning' as const, title: 'Route collection record needs review', message: `${reconciliation.deliveryRun.runNumber} · ${reconciliation.deliveryRun.area || reconciliation.deliveryRun.route}`, createdAt: reconciliation.reconciliationDate, module: 'sales-reports' })),
    ...pendingBo.map(bo => ({ id: `bo-${bo.id}`, type: 'bo', level: 'warning' as const, title: 'BO needs action', message: `${bo.storeName || 'Supplier'} · ${bo.productName} × ${bo.quantity} · ₱${bo.totalDeduction.toFixed(2)}`, createdAt: bo.createdAt, module: 'inventory' })),
    ...recentActivity.map(activity => {
      let details: Record<string, any> = {};
      try { details = JSON.parse(activity.details || '{}'); } catch { /* Older audit rows may not contain JSON. */ }
      const context = details.bookingNumber || details.runNumber || details.storeName || details.store || details.poNumber || details.invoiceNumber || details.serialNumber || '';
      const amountValue = details.netAmountDue ?? details.totalAmount ?? details.totalDeduction ?? details.amountPaid ?? details.amount;
      const amount = Number.isFinite(Number(amountValue)) && amountValue !== undefined ? `₱${Number(amountValue).toFixed(2)}` : '';
      const moduleName = String(activity.module || '').toLowerCase();
      const module = moduleName.includes('inventory') || moduleName.includes('receiving') ? 'inventory'
        : moduleName.includes('freezer') || moduleName.includes('store') ? (isAdmin ? 'stores-freezers' : 'dashboard')
          : moduleName.includes('sales') || moduleName.includes('invoice') || moduleName.includes('quota') || moduleName.includes('reconciliation') ? 'sales-reports'
            : moduleName.includes('setting') || moduleName.includes('staff') ? (isAdmin ? 'settings' : 'dashboard')
              : 'orders-delivery';
      const message = [activity.module, context, amount, activity.user].filter(Boolean).join(' · ');
      return { id: `activity-${activity.id}`, type: 'activity', level: 'info' as const, title: activity.action, message, createdAt: activity.timestamp, module };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 300);
}

async function loadUserNotifications(userId: string, isAdmin: boolean) {
  const generated = await buildNotifications(isAdmin);
  const states = generated.length ? await prisma.userNotificationState.findMany({
    where: { userId, notificationId: { in: generated.map(item => item.id) } },
  }) : [];
  const stateById = new Map(states.map(state => [state.notificationId, state]));
  const notifications = generated
    .filter(item => !stateById.get(item.id)?.isDeleted)
    .map(item => ({
      ...item,
      isRead: stateById.has(item.id)
        ? Boolean(stateById.get(item.id)?.isRead)
        : !(item.level === 'urgent' || item.level === 'warning' || item.type === 'activity'),
    }));
  return { notifications, unreadCount: notifications.filter(item => !item.isRead).length };
}

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(await loadUserNotifications(req.user!.id, req.user!.role === 'Admin'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { notifications } = await loadUserNotifications(userId, req.user!.role === 'Admin');
    const ids = notifications.filter(item => !item.isRead).map(item => item.id);
    if (ids.length) {
      await prisma.userNotificationState.createMany({
        data: ids.map(notificationId => ({ userId, notificationId, isRead: true })),
        skipDuplicates: true,
      });
      await prisma.userNotificationState.updateMany({ where: { userId, notificationId: { in: ids } }, data: { isRead: true } });
    }
    res.json(await loadUserNotifications(userId, req.user!.role === 'Admin'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:notificationId/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = String(req.params.notificationId);
    const current = await loadUserNotifications(userId, req.user!.role === 'Admin');
    if (!current.notifications.some(item => item.id === notificationId)) return res.status(404).json({ error: 'Notification not found.' });
    await prisma.userNotificationState.upsert({
      where: { userId_notificationId: { userId, notificationId } },
      create: { userId, notificationId, isRead: true },
      update: { isRead: true },
    });
    res.json(await loadUserNotifications(userId, req.user!.role === 'Admin'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:notificationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = String(req.params.notificationId);
    const generated = await buildNotifications(req.user!.role === 'Admin');
    if (!generated.some(item => item.id === notificationId)) return res.status(404).json({ error: 'Notification not found.' });
    await prisma.userNotificationState.upsert({
      where: { userId_notificationId: { userId, notificationId } },
      create: { userId, notificationId, isRead: true, isDeleted: true },
      update: { isRead: true, isDeleted: true },
    });
    res.json(await loadUserNotifications(userId, req.user!.role === 'Admin'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { notifications } = await loadUserNotifications(userId, req.user!.role === 'Admin');
    const ids = notifications.map(item => item.id);
    if (ids.length) {
      await prisma.userNotificationState.createMany({
        data: ids.map(notificationId => ({ userId, notificationId, isRead: true, isDeleted: true })),
        skipDuplicates: true,
      });
      await prisma.userNotificationState.updateMany({ where: { userId, notificationId: { in: ids } }, data: { isRead: true, isDeleted: true } });
    }
    res.json(await loadUserNotifications(userId, req.user!.role === 'Admin'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
