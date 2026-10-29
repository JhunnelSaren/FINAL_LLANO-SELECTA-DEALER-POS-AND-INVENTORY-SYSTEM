import prisma from './db.js';
import { oneManilaCalendarMonthAgo } from './business-time.js';
import { recordAudit } from './auth.js';

export async function deactivateDormantCustomers(now = new Date()) {
  const cutoff = oneManilaCalendarMonthAgo(now);
  const [customers, latestBookings] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, dateAdded: true, lastOrderAt: true } }),
    prisma.booking.groupBy({
      by: ['customerId'],
      where: { status: { not: 'Cancelled' } },
      _max: { bookingDate: true },
    }),
  ]);
  const latestByCustomer = new Map(latestBookings.map(row => [row.customerId, row._max.bookingDate]));
  const staleSnapshots = customers.filter(customer => {
    const actualLastOrder = latestByCustomer.get(customer.id) || customer.dateAdded;
    return customer.lastOrderAt?.getTime() !== actualLastOrder.getTime();
  });
  if (staleSnapshots.length > 0) {
    await prisma.$transaction(staleSnapshots.map(customer => prisma.customer.update({
      where: { id: customer.id },
      data: { lastOrderAt: latestByCustomer.get(customer.id) || customer.dateAdded },
    })));
  }
  const result = await prisma.customer.updateMany({
    where: { status: 'Active', lastOrderAt: { lt: cutoff } },
    data: { status: 'Inactive' },
  });

  if (result.count > 0) {
    await recordAudit('Auto-deactivate Dormant Stores', 'Stores', 'System', {
      count: result.count,
      inactiveSince: cutoff.toISOString(),
    });
  }
  return result.count;
}
