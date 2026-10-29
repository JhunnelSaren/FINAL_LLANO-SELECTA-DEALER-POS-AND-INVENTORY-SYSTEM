import { Router, Response } from 'express';
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
    const totalDeductionsValue = boRecords.reduce((sum, it) => sum + it.totalDeduction, 0);

    res.json({
      totalQuarantinedUnits,
      totalDeductionsValue,
      records: boRecords,
    });
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

    if (bo.disposition === 'Refunded' && disposition === 'Refunded') {
      return res.status(409).json({ error: 'This BO has already been recorded as refunded.' });
    }

    const updated = await prisma.boDiscrepancy.update({
      where: { id },
      data: {
        disposition,
        dispositionBy: req.user?.name || 'Dealer Admin',
        dispositionAt: new Date(),
        notes: notes ? `${bo.notes ? bo.notes + ' | ' : ''}Refund: ${notes}` : undefined,
      },
    });

    await recordAudit('Update BO Disposition', 'Inventory', req.user?.name || 'Staff', {
      boId: id,
      product: bo.productName,
      disposition,
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
      .filter((p) => p.stock <= p.minStock)
      .map((p) => ({
        ...p,
        availableStock: Math.max(0, p.stock - p.reservedStock),
        deficit: Math.max(0, p.minStock - p.stock),
        suggestedReorder: Math.max(20, (p.minStock * 2) - p.stock),
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

export default router;
