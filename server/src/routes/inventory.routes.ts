import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import prisma from '../db.js';
import { authenticateToken, requireRole, recordAudit, AuthenticatedRequest } from '../auth.js';
import * as xlsx from 'xlsx';

const router = Router();

// GET /api/inventory/ledger
router.get('/ledger', authenticateToken, async (req, res: Response) => {
  const { productId, movementType, search, dateFrom, dateTo } = req.query;
  const requestedPage = Number.parseInt(String(req.query.page || '1'), 10);
  const requestedLimit = Number.parseInt(String(req.query.limit || '50'), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  try {
    const where: any = {};
    if (productId && productId !== 'all') {
      where.productId = String(productId);
    }
    if (movementType && movementType !== 'all') {
      where.movementType = String(movementType);
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(`${String(dateFrom)}T00:00:00+08:00`);
      if (dateTo) {
        const endExclusive = new Date(`${String(dateTo)}T00:00:00+08:00`);
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
        where.createdAt.lt = endExclusive;
      }
    }
    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      where.OR = [
        { productName: { contains: q } },
        { reference: { contains: q } },
        { staffName: { contains: q } },
      ];
    }

    const [ledger, total] = await Promise.all([
      prisma.inventoryLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.inventoryLedger.count({ where }),
    ]);

    res.json({ entries: ledger, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/bo (Damaged & Quarantined items)
router.get('/bo', authenticateToken, async (req, res: Response) => {
  const { disposition, search } = req.query;
  try {
    const where: any = {};
    if (disposition && disposition !== 'all') {
      where.disposition = String(disposition);
    }
    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      where.OR = [
        { productName: { contains: q } },
        { storeName: { contains: q } },
        { deliveryRef: { contains: q } },
      ];
    }

    const boRecords = await prisma.boDiscrepancy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const totalQuarantinedUnits = boRecords.reduce((sum, it) => sum + it.quantity, 0);
    const totalDeductionsValue = boRecords.reduce((sum, it) => sum + Number(it.totalDeduction), 0);

    res.json({
      totalQuarantinedUnits,
      totalDeductionsValue,
      records: boRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/bo (Record a customer BO credit amount without changing stock)
router.post('/bo', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const customerId = String(req.body.customerId || '').trim();
  const totalAmount = Number(req.body.totalAmount ?? req.body.amount);
  const reason = String(req.body.reason || '').trim();
  const notes = String(req.body.notes || '').trim();
  const disposition = String(req.body.disposition || 'Pending');

  if (!customerId || !Number.isFinite(totalAmount) || totalAmount <= 0 || !reason) {
    return res.status(400).json({ error: 'Choose a customer, enter a BO total greater than zero, and provide a reason.' });
  }
  if (!['Pending', 'Refunded'].includes(disposition)) {
    return res.status(400).json({ error: 'BO status must be Pending or Refunded.' });
  }
  if (disposition === 'Refunded' && !notes) {
    return res.status(400).json({ error: 'Add the refund or credit details before marking this BO as refunded.' });
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer store not found.' });

    const totalDeduction = Number(totalAmount.toFixed(2));
    const id = `BO-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const staffName = req.user?.name || 'Dealer Admin';
    const result = await prisma.boDiscrepancy.create({
      data: {
        id,
        customerId: customer.id,
        storeName: customer.storeName,
        productId: 'CUSTOMER-BO',
        productName: 'Customer BO Amount',
        category: 'Customer BO Amount',
        quantity: 0,
        unitPrice: totalDeduction,
        totalDeduction,
        reason,
        reportedBy: staffName,
        disposition,
        dispositionBy: disposition === 'Refunded' ? staffName : null,
        dispositionAt: disposition === 'Refunded' ? new Date() : null,
        notes: notes || null,
      },
    });

    await recordAudit('Record Customer BO', 'Inventory', staffName, {
      boId: id, storeName: customer.storeName, type: 'Amount only', totalDeduction, disposition,
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/bo/:id/disposition (Admin authorized outcome for BO stock)
router.post('/bo/:id/disposition', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { disposition, notes } = req.body;
  try {
    const bo = await prisma.boDiscrepancy.findUnique({ where: { id } });
    if (!bo) {
      return res.status(404).json({ error: 'BO record not found.' });
    }

    const allowed = ['Pending', 'Refunded'];
    if (!allowed.includes(disposition)) {
      return res.status(400).json({ error: 'BO status must be Pending or Refunded.' });
    }

    const cleanNotes = String(notes || '').trim();
    if (disposition === 'Refunded' && !cleanNotes && !bo.notes) {
      return res.status(400).json({ error: 'Add the refund or credit details before marking this BO as refunded.' });
    }

    const updated = await prisma.boDiscrepancy.update({
      where: { id },
      data: {
        disposition,
        dispositionBy: disposition === 'Refunded' ? req.user?.name || 'Dealer Admin' : null,
        dispositionAt: disposition === 'Refunded' ? new Date() : null,
        notes: cleanNotes ? `${bo.notes ? bo.notes + ' | ' : ''}${disposition}: ${cleanNotes}` : bo.notes,
      },
    });

    await recordAudit('Update BO Disposition', 'Inventory', req.user?.name || 'Staff', {
      boId: id,
      product: bo.productName,
      previousDisposition: bo.disposition,
      disposition,
      totalDeduction: bo.totalDeduction,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/low-stock
router.get('/low-stock', authenticateToken, async (_req, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    const lowStock = products
      .map((p) => ({ ...p, availableStock: Math.max(0, p.stock - p.reservedStock) }))
      .filter((p) => p.availableStock <= p.minStock)
      .map((p) => ({
        ...p,
        deficit: Math.max(0, p.minStock - p.availableStock),
        suggestedReorder: Math.max(20, (p.minStock * 2) - p.availableStock),
      }));

    res.json(lowStock);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/export
router.get('/export', authenticateToken, async (_req, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    const rows = products.map((p) => ({
      'SKU / ID': p.id,
      'Product Name': p.name,
      'Category': p.category,
      'Unit': p.unit,
      'Physical Stock': p.stock,
      'Reserved Stock': p.reservedStock,
      'Available Stock': Math.max(0, p.stock - p.reservedStock),
      'Quarantine / BO Stock': p.quarantineStock,
      'Min Safety Stock': p.minStock,
      'Dealer Cost (₱)': Number(p.dealerPrice),
      'Selling Price (₱)': Number(p.sellingPrice),
      'SRP (₱)': Number(p.srp),
      'Total Valuation (₱)': Number((p.stock * Number(p.dealerPrice)).toFixed(2)),
      'Status': p.isActive ? 'Active' : 'Inactive',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Stock On Hand');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="llano_selecta_inventory_ledger.xlsx"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/adjustment-requests (List pending and reviewed requests)
router.get('/adjustment-requests', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = (prisma as any).stockAdjustmentRequest
      ? await (prisma as any).stockAdjustmentRequest.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : await prisma.$queryRaw<any[]>`
          SELECT * FROM \`stockadjustmentrequest\`
          ORDER BY \`createdAt\` DESC
          LIMIT 100
        `.catch(() => []);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjustment-requests (Staff/Admin submits stock edit request for Admin permission)
router.post('/adjustment-requests', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { productId, requestedChange, reason, notes } = req.body;
  try {
    if (!productId || requestedChange === undefined || !reason) {
      return res.status(400).json({ error: 'Product ID, requested change quantity, and reason are required.' });
    }

    const change = Number(requestedChange);
    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({ error: 'Adjustment change must be a non-zero whole number.' });
    }

    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const currentStock = product.stock;
    const proposedStock = currentStock + change;
    if (proposedStock < 0) {
      return res.status(400).json({ error: `Cannot deduct ${Math.abs(change)} units. Current stock is ${currentStock}.` });
    }

    const requestId = `REQ-${Date.now().toString().slice(-6)}`;
    const staffId = req.user?.id || 'staff';
    const staffName = req.user?.name || 'Staff Member';

    if ((prisma as any).stockAdjustmentRequest) {
      await (prisma as any).stockAdjustmentRequest.create({
        data: {
          id: requestId,
          productId: product.id,
          productName: product.name,
          currentStock,
          requestedChange: change,
          proposedStock,
          reason: String(reason).trim(),
          notes: notes ? String(notes).trim() : null,
          staffId,
          staffName,
          status: 'Pending',
        },
      });
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`stockadjustmentrequest\` (
          \`id\`, \`productId\`, \`productName\`, \`currentStock\`, \`requestedChange\`,
          \`proposedStock\`, \`reason\`, \`notes\`, \`staffId\`, \`staffName\`, \`status\`, \`createdAt\`, \`updatedAt\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(3), NOW(3))`,
        requestId,
        product.id,
        product.name,
        currentStock,
        change,
        proposedStock,
        String(reason).trim(),
        notes ? String(notes).trim() : null,
        staffId,
        staffName
      );
    }

    await recordAudit('Request Stock Adjustment', 'Inventory', staffName, {
      requestId,
      productId: product.id,
      productName: product.name,
      currentStock,
      requestedChange: change,
      proposedStock,
      reason: String(reason).trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Stock adjustment request submitted successfully for Admin approval.',
      request: {
        id: requestId,
        productId: product.id,
        productName: product.name,
        currentStock,
        requestedChange: change,
        proposedStock,
        reason: String(reason).trim(),
        notes,
        staffName,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjustment-requests/:id/approve (Admin approves request & executes stock adjustment)
router.post('/adjustment-requests/:id/approve', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body || {};
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM \`stockadjustmentrequest\` WHERE \`id\` = ${id} LIMIT 1
    `;
    const request = rows[0];
    if (!request) {
      return res.status(404).json({ error: 'Adjustment request not found.' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ error: `This request is already ${request.status.toLowerCase()}.` });
    }

    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrator';

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: request.productId } });
      if (!product) throw new Error('PRODUCT_NOT_FOUND');

      const targetStock = product.stock + request.requestedChange;
      if (targetStock < 0) {
        throw new Error(`Adjustment would result in negative stock (${targetStock}).`);
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { stock: targetStock },
      });

      await tx.inventoryLedger.create({
        data: {
          productId: product.id,
          productName: product.name,
          movementType: 'Physical Adjustment',
          changeQty: request.requestedChange,
          runningSaleable: targetStock,
          runningQuarantine: product.quarantineStock,
          reference: request.id,
          staffName: `${request.staffName} (Approved by ${adminName})`,
          notes: `Admin Approved Adjustment: ${request.reason}${notes ? ` — ${notes}` : ''}`,
        },
      });

      return { product, updatedProduct, targetStock };
    });

    if ((prisma as any).stockAdjustmentRequest) {
      await (prisma as any).stockAdjustmentRequest.update({
        where: { id },
        data: {
          status: 'Approved',
          adminId,
          adminName,
          adminNotes: notes ? String(notes).trim() : 'Approved by Admin',
          reviewedAt: new Date(),
        },
      });
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE \`stockadjustmentrequest\`
         SET \`status\` = 'Approved', \`adminId\` = ?, \`adminName\` = ?, \`adminNotes\` = ?, \`reviewedAt\` = NOW(3), \`updatedAt\` = NOW(3)
         WHERE \`id\` = ?`,
        adminId,
        adminName,
        notes ? String(notes).trim() : 'Approved by Admin',
        id
      );
    }

    await recordAudit('Approve Stock Adjustment', 'Inventory', adminName, {
      requestId: id,
      productId: request.productId,
      productName: request.productName,
      staffName: request.staffName,
      changeQty: request.requestedChange,
      oldStock: result.product.stock,
      newStock: result.targetStock,
    });

    res.json({
      success: true,
      message: `Stock on Hand for "${request.productName}" updated to ${result.targetStock} units.`,
      product: result.updatedProduct,
    });
  } catch (err: any) {
    if (err.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Product associated with this request was not found.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjustment-requests/:id/reject (Admin rejects request)
router.post('/adjustment-requests/:id/reject', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason, notes } = req.body || {};
  try {
    const request = (prisma as any).stockAdjustmentRequest
      ? await (prisma as any).stockAdjustmentRequest.findUnique({ where: { id } })
      : (await prisma.$queryRaw<any[]>`SELECT * FROM \`stockadjustmentrequest\` WHERE \`id\` = ${id} LIMIT 1`.catch(() => []))[0];

    if (!request) {
      return res.status(404).json({ error: 'Adjustment request not found.' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ error: `This request has already been ${request.status.toLowerCase()}.` });
    }

    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrator';
    const rejectionReason = (reason || notes || 'Declined by Admin').trim();

    if ((prisma as any).stockAdjustmentRequest) {
      await (prisma as any).stockAdjustmentRequest.update({
        where: { id },
        data: {
          status: 'Rejected',
          adminId,
          adminName,
          adminNotes: rejectionReason,
          reviewedAt: new Date(),
        },
      });
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE \`stockadjustmentrequest\`
         SET \`status\` = 'Rejected', \`adminId\` = ?, \`adminName\` = ?, \`adminNotes\` = ?, \`reviewedAt\` = NOW(3), \`updatedAt\` = NOW(3)
         WHERE \`id\` = ?`,
        adminId,
        adminName,
        rejectionReason,
        id
      );
    }

    await recordAudit('Reject Stock Adjustment', 'Inventory', adminName, {
      requestId: id,
      productId: request.productId,
      productName: request.productName,
      staffName: request.staffName,
      reason: rejectionReason,
    });

    res.json({
      success: true,
      message: 'Stock adjustment request rejected.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
