import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';
import { upload } from '../upload.js';
import * as xlsx from 'xlsx';

const router = Router();

// GET /api/bookings
router.get('/', authenticateToken, async (req, res: Response) => {
  const { route, area, status, dateFrom, dateTo, search } = req.query;
  try {
    const where: any = {};
    if (route && route !== 'all') {
      where.route = String(route);
    }
    if (area && area !== 'all') where.area = String(area);
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (dateFrom && dateTo) {
      where.bookingDate = {
        gte: new Date(String(dateFrom)),
        lte: new Date(String(dateTo) + 'T23:59:59.999Z'),
      };
    }
    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      where.OR = [
        { bookingNumber: { contains: q } },
        { storeName: { contains: q } },
        { bookerName: { contains: q } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { bookingDate: 'desc' },
    });

    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/consolidated
router.get('/consolidated', authenticateToken, async (req, res: Response) => {
  const { route, area, bookingIds, status } = req.query;
  try {
    const where: any = {};
    if (route && route !== 'all') {
      where.route = String(route);
    }
    if (area && area !== 'all') where.area = String(area);
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (bookingIds) {
      const ids = String(bookingIds).split(',');
      where.id = { in: ids };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { items: true },
    });

    // Consolidate totals by product
    const productSummaryMap = new Map<string, {
      productId: string;
      productName: string;
      category: string;
      unitPrice: number;
      totalQuantity: number;
      totalAmount: number;
      storesCount: number;
    }>();

    for (const b of bookings) {
      for (const item of b.items) {
        if (!productSummaryMap.has(item.productId)) {
          productSummaryMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            category: item.category,
            unitPrice: item.unitPrice,
            totalQuantity: 0,
            totalAmount: 0,
            storesCount: 0,
          });
        }
        const record = productSummaryMap.get(item.productId)!;
        record.totalQuantity += item.quantity;
        record.totalAmount += item.lineTotal;
        record.storesCount += 1;
      }
    }

    const summary = Array.from(productSummaryMap.values());
    const grandTotalQuantity = summary.reduce((s, it) => s + it.totalQuantity, 0);
    const grandTotalAmount = summary.reduce((s, it) => s + it.totalAmount, 0);

    res.json({
      totalBookings: bookings.length,
      grandTotalQuantity,
      grandTotalAmount,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { customerId, bookingDate, bookerName, notes, items } = req.body;
  try {
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one order line are required.' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    if (customer.status !== 'Active') {
      return res.status(409).json({ error: 'This store is inactive. Reactivate it in Stores & Customers before creating a booking.' });
    }

    // Calculate line items and subtotal server-side
    let calculatedSubtotal = 0;
    const validatedItems: {
      productId: string;
      productName: string;
      category: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const line of items) {
      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        return res.status(400).json({ error: `Product ID "${line.productId}" not found in catalog.` });
      }
      const qty = parseInt(line.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for product ${product.name}.` });
      }
      const unitPrice = Number(product.sellingPrice);
      const lineTotal = Number((qty * unitPrice).toFixed(2));
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        unitPrice,
        quantity: qty,
        lineTotal,
      });
    }

    const bookingId = `BK-${Date.now().toString().slice(-6)}`;
    const bookingNumber = `BK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const bookedAt = bookingDate ? new Date(bookingDate) : new Date();
    if (!Number.isFinite(bookedAt.getTime())) return res.status(400).json({ error: 'Enter a valid booking date.' });

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          id: bookingId,
          bookingNumber,
          customerId: customer.id,
          storeName: customer.storeName,
          route: customer.route || customer.area,
          area: customer.area,
          bookingDate: bookedAt,
          bookerName: bookerName?.trim() || req.user?.name || 'Pedro Booker',
          status: 'Booked',
          subtotal: calculatedSubtotal,
          notes: notes || null,
          items: { create: validatedItems },
        },
        include: { items: true, customer: true },
      });
      await tx.customer.update({ where: { id: customer.id }, data: { lastOrderAt: bookedAt } });
      return created;
    });

    await recordAudit('Create Booking', 'Bookings', req.user?.name || 'Booker', {
      bookingNumber: booking.bookingNumber,
      store: customer.storeName,
      subtotal: calculatedSubtotal,
    });

    res.status(201).json(booking);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { bookerName, notes, items, status } = req.body;
  try {
    const existing = await prisma.booking.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (existing.status === 'Delivered' && req.user?.role !== 'Admin') {
      return res.status(403).json({ error: 'Cannot edit an already delivered booking without Dealer Admin authorization.' });
    }

    let calculatedSubtotal = existing.subtotal;

    if (items && Array.isArray(items)) {
      // Re-calculate lines
      await prisma.bookingItem.deleteMany({ where: { bookingId: id } });
      calculatedSubtotal = 0;
      const validatedItems: any[] = [];

      for (const line of items) {
        const product = await prisma.product.findUnique({ where: { id: line.productId } });
        if (!product) {
          return res.status(400).json({ error: `Product ID "${line.productId}" not found.` });
        }
        const qty = parseInt(line.quantity, 10);
        if (isNaN(qty) || qty <= 0) continue;
        const unitPrice = Number(product.sellingPrice);
        const lineTotal = Number((qty * unitPrice).toFixed(2));
        calculatedSubtotal += lineTotal;
        validatedItems.push({
          bookingId: id,
          productId: product.id,
          productName: product.name,
          category: product.category,
          unitPrice,
          quantity: qty,
          lineTotal,
        });
      }

      await prisma.bookingItem.createMany({ data: validatedItems });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        bookerName: bookerName?.trim(),
        notes,
        status: status || undefined,
        subtotal: calculatedSubtotal,
      },
      include: { items: true, customer: true },
    });

    await recordAudit('Update Booking', 'Bookings', req.user?.name || 'Staff', { bookingId: id, bookingNumber: updated.bookingNumber });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/import (Excel/CSV upload)
router.post('/import', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel or CSV file.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json<any>(worksheet);

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file contains no data rows.' });
    }

    const errors: string[] = [];
    const groupedBookings = new Map<string, {
      storeCode: string;
      storeName: string;
      route: string;
      bookerName: string;
      notes: string;
      lines: { sku: string; name: string; qty: number; unitPrice: number }[];
    }>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // header is row 1

      const storeCode = (row.Store_Code || row['Store Code'] || row.Store_Id || '').toString().trim();
      const storeName = (row.Store_Name || row['Store Name'] || '').toString().trim();
      const sku = (row.Product_SKU || row['Product SKU'] || row.SKU || '').toString().trim();
      const quantityRaw = row.Quantity || row.Qty;
      const quantity = parseInt(quantityRaw, 10);
      const bookerName = (row.Booker_Name || row['Booker Name'] || req.user?.name || 'Booker').toString().trim();
      const notes = (row.Notes || '').toString().trim();

      if (!storeCode && !storeName) {
        errors.push(`Row ${rowNum}: Missing store code or store name.`);
        continue;
      }

      if (!sku) {
        errors.push(`Row ${rowNum}: Missing product SKU.`);
        continue;
      }

      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Row ${rowNum}: Invalid quantity "${quantityRaw}". Must be a positive integer.`);
        continue;
      }

      // Check customer match
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { id: storeCode },
            { storeName: storeName },
          ],
        },
      });

      if (!customer) {
        errors.push(`Row ${rowNum}: Unmatched store "${storeName || storeCode}". Register store first.`);
        continue;
      }

      // Check product match
      let product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: sku },
            { sku: sku },
          ],
        },
      });

      if (!product) {
        errors.push(`Row ${rowNum}: Unknown product SKU "${sku}". Product not in Selecta catalog.`);
        continue;
      }

      const key = customer.id;
      if (!groupedBookings.has(key)) {
        groupedBookings.set(key, {
          storeCode: customer.id,
          storeName: customer.storeName,
          route: customer.route || customer.area,
          bookerName,
          notes,
          lines: [],
        });
      }

      groupedBookings.get(key)!.lines.push({
        sku: product.id,
        name: product.name,
        qty: quantity,
        unitPrice: Number(product.sellingPrice),
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Excel import validation failed. Please fix errors before importing.',
        errors,
      });
    }

    // Persist all grouped bookings
    const createdBookings: any[] = [];
    for (const entry of groupedBookings.values()) {
      let subtotal = 0;
      const itemsToCreate = entry.lines.map((l) => {
        const lineTotal = Number((l.qty * l.unitPrice).toFixed(2));
        subtotal += lineTotal;
        return {
          productId: l.sku,
          productName: l.name,
          category: 'CORNETTO',
          unitPrice: l.unitPrice,
          quantity: l.qty,
          lineTotal,
        };
      });

      const bId = `BK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const bNum = `BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const customer = await prisma.customer.findUnique({ where: { id: entry.storeCode } });

      const booking = await prisma.booking.create({
        data: {
          id: bId,
          bookingNumber: bNum,
          customerId: entry.storeCode,
          storeName: entry.storeName,
          route: entry.route,
          area: customer?.area || 'Valencia',
          bookingDate: new Date(),
          bookerName: entry.bookerName,
          status: 'Booked',
          subtotal,
          notes: `Imported via Excel template - ${entry.notes}`,
          items: {
            create: itemsToCreate,
          },
        },
      });
      createdBookings.push(booking);
    }

    await recordAudit('Excel Import Bookings', 'Bookings', req.user?.name || 'Staff', { count: createdBookings.length });
    res.json({
      success: true,
      importedCount: createdBookings.length,
      bookings: createdBookings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/export
router.get('/export', authenticateToken, async (req, res: Response) => {
  const { route, area, status } = req.query;
  try {
    const where: any = {};
    if (route && route !== 'all') {
      where.route = String(route);
    }
    if (area && area !== 'all') where.area = String(area);
    if (status && status !== 'all') {
      where.status = String(status);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { items: true, customer: true },
      orderBy: { bookingDate: 'desc' },
    });

    const rows: any[] = [];
    for (const b of bookings) {
      for (const item of b.items) {
        rows.push({
          'Booking Number': b.bookingNumber,
          'Booking Date': b.bookingDate.toISOString().split('T')[0],
          'Store Code': b.customerId,
          'Store Name': b.storeName,
          'Route': b.route,
          'Booker': b.bookerName,
          'Status': b.status,
          'Product SKU': item.productId,
          'Product Name': item.productName,
          'Quantity': item.quantity,
          'Unit Price (₱)': item.unitPrice,
          'Line Total (₱)': item.lineTotal,
          'Notes': b.notes || '',
        });
      }
    }

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="llano_selecta_bookings_export.xlsx"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
