import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../auth.js';
import * as xlsx from 'xlsx';

const router = Router();

function reportDate(value: unknown, endOfDay = false): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const dateTime = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}+08:00`
    : value;
  const parsed = new Date(dateTime);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

// 1. Sales Report (Daily & Monthly)
router.get('/sales', authenticateToken, async (req, res: Response) => {
  const { dateFrom, dateTo, exportExcel, route } = req.query;
  try {
    const where: any = {};
    const from = reportDate(dateFrom);
    const to = reportDate(dateTo, true);
    if (from || to) where.invoiceDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (route && route !== 'all') where.deliveryStop = { is: { deliveryRun: { is: { route: String(route) } } } };

    const invoices = await prisma.customerInvoice.findMany({
      where,
      include: {
        payments: true,
        deliveryStop: { include: { deliveryRun: true, items: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const totalInvoiced = invoices.reduce((s, inv) => s + inv.netAmountDue, 0);
    const totalCollected = invoices.reduce((s, inv) => s + inv.totalPaid, 0);
    const totalOutstanding = invoices.reduce((s, inv) => s + inv.balanceRemaining, 0);
    const products = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
    const customers = new Map<string, { name: string; orders: number; revenue: number }>();
    const routes = new Map<string, { route: string; orders: number; revenue: number }>();
    for (const invoice of invoices) {
      const customer = customers.get(invoice.storeName) || { name: invoice.storeName, orders: 0, revenue: 0 };
      customer.orders += 1;
      customer.revenue += invoice.netAmountDue;
      customers.set(invoice.storeName, customer);
      const routeName = invoice.deliveryStop?.deliveryRun?.route;
      if (routeName) {
        const routeRow = routes.get(routeName) || { route: routeName, orders: 0, revenue: 0 };
        routeRow.orders += 1;
        routeRow.revenue += invoice.netAmountDue;
        routes.set(routeName, routeRow);
      }
      for (const item of invoice.deliveryStop?.items ?? []) {
        const key = item.productId || item.productName;
        const product = products.get(key) || { name: item.productName, sku: item.productId, qty: 0, revenue: 0 };
        const billableQty = Math.max(0, item.acceptedQty - item.boRefusedQty);
        product.qty += billableQty;
        product.revenue += billableQty * item.unitPrice;
        products.set(key, product);
      }
    }

    if (exportExcel === 'true') {
      const rows = invoices.map((inv) => ({
        'Invoice #': inv.invoiceNumber,
        'Date': inv.invoiceDate.toISOString().split('T')[0],
        'Store Name': inv.storeName,
        'Billable Products (₱)': inv.billableProductAmount,
        'BO Deduction (₱)': inv.boDeductionAmount,
        'Net Amount Due (₱)': inv.netAmountDue,
        'Amount Paid (₱)': inv.totalPaid,
        'Balance (₱)': inv.balanceRemaining,
        'Status': inv.paymentStatus,
        'Collector': inv.collectorName || '',
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sales Report');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="llano_sales_report.xlsx"');
      return res.send(buf);
    }

    res.json({
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      count: invoices.length,
      invoices,
      totalSales: totalInvoiced,
      totalOrders: invoices.length,
      byProduct: Array.from(products.values()).sort((a, b) => b.revenue - a.revenue),
      byCustomer: Array.from(customers.values()).sort((a, b) => b.revenue - a.revenue),
      byRoute: Array.from(routes.values()).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fulfillment Report
router.get('/fulfillment', authenticateToken, async (req, res: Response) => {
  const { route, dateFrom, dateTo, exportExcel } = req.query;
  try {
    const where: any = {};
    if (route && route !== 'all') {
      where.route = String(route);
    }
    const from = reportDate(dateFrom);
    const to = reportDate(dateTo, true);
    if (from || to) where.deliveryDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const runs = await prisma.deliveryRun.findMany({
      where,
      include: {
        stops: {
          include: { items: true },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    });

    let totalOrdered = 0;
    let totalLoaded = 0;
    let totalAccepted = 0;
    let totalMissing = 0;
    let totalBoRefused = 0;
    const products = new Map<string, { name: string; ordered: number; delivered: number; shortage: number; rate: number }>();

    for (const r of runs) {
      for (const st of r.stops) {
        for (const it of st.items) {
          totalOrdered += it.orderedQty;
          totalLoaded += it.loadedQty;
          totalAccepted += it.acceptedQty;
          totalMissing += it.missingQty;
          totalBoRefused += it.boRefusedQty;
          const key = it.productId || it.productName;
          const product = products.get(key) || { name: it.productName, ordered: 0, delivered: 0, shortage: 0, rate: 0 };
          product.ordered += it.orderedQty;
          product.delivered += it.acceptedQty;
          product.shortage += Math.max(0, it.orderedQty - it.acceptedQty);
          products.set(key, product);
        }
      }
    }

    for (const product of products.values()) {
      product.rate = product.ordered > 0 ? Number(((product.delivered / product.ordered) * 100).toFixed(1)) : 100;
    }

    const fulfillmentRate = totalOrdered > 0 ? Number(((totalAccepted / totalOrdered) * 100).toFixed(1)) : 100;

    if (exportExcel === 'true') {
      const rows = runs.map((r) => ({
        'Run #': r.runNumber,
        'Date': r.deliveryDate.toISOString().split('T')[0],
        'Route': r.route,
        'Driver': r.driver,
        'Loaders': `${r.loader1}, ${r.loader2}`,
        'Status': r.status,
        'Stops Count': r.stops.length,
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Fulfillment');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="llano_fulfillment_report.xlsx"');
      return res.send(buf);
    }

    res.json({
      totalOrdered,
      totalLoaded,
      totalAccepted,
      totalMissing,
      totalBoRefused,
      fulfillmentRate,
      runsCount: runs.length,
      runs,
      totalDelivered: totalAccepted,
      totalShortages: Math.max(0, totalOrdered - totalAccepted),
      byProduct: Array.from(products.values()).sort((a, b) => b.ordered - a.ordered),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Customer Receivables Report
router.get('/receivables', authenticateToken, async (req, res: Response) => {
  const { area, route, exportExcel } = req.query;
  try {
    const where: any = { currentBalance: { gt: 0 } };
    if (area && area !== 'all') {
      where.area = String(area);
    }
    if (route && route !== 'all') {
      where.route = String(route);
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { currentBalance: 'desc' },
    });
    const invoiceRows = customers.length ? await prisma.customerInvoice.findMany({
      where: { customerId: { in: customers.map((customer) => customer.id) }, balanceRemaining: { gt: 0 } },
      select: { customerId: true, invoiceDate: true },
      orderBy: { invoiceDate: 'asc' },
    }) : [];
    const invoiceDatesByCustomer = new Map<string, Date[]>();
    for (const invoice of invoiceRows) {
      const dates = invoiceDatesByCustomer.get(invoice.customerId) || [];
      dates.push(invoice.invoiceDate);
      invoiceDatesByCustomer.set(invoice.customerId, dates);
    }

    const totalReceivables = customers.reduce((s, c) => s + c.currentBalance, 0);

    if (exportExcel === 'true') {
      const rows = customers.map((c) => ({
        'Customer Code': c.id,
        'Store Name': c.storeName,
        'Owner': c.ownerName,
        'Area': c.area,
        'Route': c.route,
        'Contact': c.contact || '',
        'Outstanding Balance (₱)': c.currentBalance,
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Receivables');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="llano_receivables_report.xlsx"');
      return res.send(buf);
    }

    res.json({
      totalReceivables,
      totalOutstanding: totalReceivables,
      count: customers.length,
      customers: customers.map((customer) => ({
        ...customer,
        name: customer.storeName,
        balance: customer.currentBalance,
        invoiceCount: invoiceDatesByCustomer.get(customer.id)?.length ?? 0,
        oldestInvoice: invoiceDatesByCustomer.get(customer.id)?.[0] ?? null,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Cash Reconciliation Discrepancy Report
router.get('/cash-discrepancies', authenticateToken, async (req, res: Response) => {
  try {
    const where: any = {};
    const from = reportDate(req.query.dateFrom);
    const to = reportDate(req.query.dateTo, true);
    const runWhere: any = {};
    if (req.query.route && req.query.route !== 'all') runWhere.route = { contains: String(req.query.route), mode: 'insensitive' };
    if (from || to) runWhere.deliveryDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (Object.keys(runWhere).length) where.deliveryRun = { is: runWhere };
    const reconciliations = await prisma.routeReconciliation.findMany({
      where,
      include: {
        deliveryRun: true,
      },
      orderBy: { reconciliationDate: 'desc' },
    });

    const totalShortages = reconciliations
      .filter((r) => r.cashVariance < 0)
      .reduce((s, r) => s + Math.abs(r.cashVariance), 0);

    const totalOverages = reconciliations
      .filter((r) => r.cashVariance > 0)
      .reduce((s, r) => s + r.cashVariance, 0);

    const records = reconciliations.map((r) => ({
      runNumber: r.deliveryRun.runNumber,
      route: r.deliveryRun.route,
      date: r.deliveryRun.deliveryDate,
      expected: r.expectedCash,
      actual: r.actualCashCounted,
      variance: r.cashVariance,
    }));

    res.json({
      totalShortages,
      totalOverages,
      reconciliations,
      totalVariance: reconciliations.reduce((sum, row) => sum + row.cashVariance, 0),
      records,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Freezer Verification Compliance Report
router.get('/freezer-compliance', authenticateToken, async (req, res: Response) => {
  const { exportExcel } = req.query;
  try {
    const freezers = await prisma.freezer.findMany({
      include: {
        customer: true,
        verifications: {
          orderBy: { scannedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { serialNumber: 'asc' },
    });

    const now = new Date();
    const rows = freezers.map((f) => {
      let status = 'Compliant';
      if (!f.nextDueAt) {
        status = 'Due';
      } else {
        const dueDate = new Date(f.nextDueAt);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          status = 'Overdue';
        } else if (diffDays <= 7) {
          status = 'Due Soon';
        }
      }

      return {
        id: f.id,
        serialNumber: f.serialNumber,
        barcode: f.barcode,
        model: f.model,
        assignedStoreName: f.customer?.storeName || f.assignedStoreName || 'Unassigned (Warehouse)',
        area: f.customer?.area || f.area,
        lastVerifiedAt: f.lastVerifiedAt,
        nextDueAt: f.nextDueAt,
        status,
        lastPhotoUrl: f.verifications[0]?.photoPath || null,
      };
    });

    const compliantCount = rows.filter((r) => r.status === 'Compliant').length;
    const dueSoonCount = rows.filter((r) => r.status === 'Due Soon').length;
    const overdueCount = rows.filter((r) => r.status === 'Overdue' || r.status === 'Due').length;
    const complianceRate = rows.length > 0 ? Number(((compliantCount / rows.length) * 100).toFixed(1)) : 100;

    if (exportExcel === 'true') {
      const excelRows = rows.map((r) => ({
        'Serial #': r.serialNumber,
        'Barcode': r.barcode,
        'Model': r.model,
        'Store / Location': r.assignedStoreName,
        'Area': r.area,
        'Last Verified': r.lastVerifiedAt ? new Date(r.lastVerifiedAt).toISOString().split('T')[0] : 'Never',
        'Next Due Date': r.nextDueAt ? new Date(r.nextDueAt).toISOString().split('T')[0] : 'Immediate',
        'Compliance Status': r.status,
      }));
      const ws = xlsx.utils.json_to_sheet(excelRows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Freezer Compliance');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="llano_freezer_compliance.xlsx"');
      return res.send(buf);
    }

    res.json({
      totalFreezers: rows.length,
      compliantCount,
      dueSoonCount,
      overdueCount,
      complianceRate,
      freezers: rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Staff & Delivery Run Performance
router.get('/staff-performance', authenticateToken, async (req, res: Response) => {
  try {
    const from = reportDate(req.query.dateFrom);
    const to = reportDate(req.query.dateTo, true);
    const where: any = {};
    if (from || to) where.deliveryDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    const runs = await prisma.deliveryRun.findMany({
      where,
      include: {
        stops: { include: { invoice: { include: { payments: true } } } },
      },
    });

    const staffMap = new Map<string, {
      name: string;
      tripsDriven: number;
      tripsLoaded: number;
      collectionsHandled: number;
      totalCollected: number;
    }>();

    for (const r of runs) {
      // Driver
      if (!staffMap.has(r.driver)) {
        staffMap.set(r.driver, { name: r.driver, tripsDriven: 0, tripsLoaded: 0, collectionsHandled: 0, totalCollected: 0 });
      }
      staffMap.get(r.driver)!.tripsDriven += 1;

      // Loader 1
      if (!staffMap.has(r.loader1)) {
        staffMap.set(r.loader1, { name: r.loader1, tripsDriven: 0, tripsLoaded: 0, collectionsHandled: 0, totalCollected: 0 });
      }
      staffMap.get(r.loader1)!.tripsLoaded += 1;

      // Loader 2
      if (!staffMap.has(r.loader2)) {
        staffMap.set(r.loader2, { name: r.loader2, tripsDriven: 0, tripsLoaded: 0, collectionsHandled: 0, totalCollected: 0 });
      }
      staffMap.get(r.loader2)!.tripsLoaded += 1;

      // Collector
      if (!staffMap.has(r.collector)) {
        staffMap.set(r.collector, { name: r.collector, tripsDriven: 0, tripsLoaded: 0, collectionsHandled: 0, totalCollected: 0 });
      }
      staffMap.get(r.collector)!.collectionsHandled += 1;

      for (const st of r.stops) {
        if (st.invoice) {
          for (const p of st.invoice.payments) {
            staffMap.get(r.collector)!.totalCollected += p.amount;
          }
        }
      }
    }

    const staff = Array.from(staffMap.values()).map((member) => ({
      ...member,
      role: [member.tripsDriven > 0 ? 'Driver' : '', member.tripsLoaded > 0 ? 'Loader' : '', member.collectionsHandled > 0 ? 'Collector' : ''].filter(Boolean).join(' / '),
      bookings: 0,
      deliveries: member.tripsDriven,
      collections: member.collectionsHandled,
    }));
    res.json({ staff });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
