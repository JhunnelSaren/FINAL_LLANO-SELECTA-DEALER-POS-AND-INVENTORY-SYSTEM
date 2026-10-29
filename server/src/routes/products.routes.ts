import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/products
router.get('/', authenticateToken, async (_req, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    const enriched = products.map((p) => ({
      ...p,
      sku: p.sku || p.id,
      dealerPrice: Number(p.dealerPrice),
      sellingPrice: Number(p.sellingPrice),
      srp: Number(p.srp),
      availableStock: Math.max(0, p.stock - p.reservedStock),
      isLowStock: p.stock <= p.minStock,
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products (Admin only)
router.post('/', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id, sku, name, category, flavor, unit, dealerPrice, sellingPrice, srp, minStock, stock, barcode } = req.body;
  try {
    if (!sku || !name || !category || sellingPrice === undefined) {
      return res.status(400).json({ error: 'SKU, name, category, and selling price are required.' });
    }

    const productId = id || sku;
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id: productId }, { sku }] },
    });

    if (existing) {
      return res.status(400).json({ error: 'Product with this ID or SKU already exists.' });
    }

    const product = await prisma.product.create({
      data: {
        id: productId,
        sku: String(sku).trim(),
        name: name.trim(),
        category: category.trim(),
        flavor: flavor?.trim() || null,
        unit: unit || 'Piece',
        dealerPrice: Number(dealerPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        srp: Number(srp) || 0,
        minStock: Number(minStock) || 15,
        stock: Number(stock) || 0,
        barcode: barcode || null,
      },
    });

    if (product.stock > 0) {
      await prisma.inventoryLedger.create({
        data: {
          productId: product.id,
          productName: product.name,
          movementType: 'Physical Adjustment',
          changeQty: product.stock,
          runningSaleable: product.stock,
          runningQuarantine: 0,
          reference: 'Initial Stock Setup',
          staffName: req.user?.name || 'Admin',
          notes: 'Initial inventory quantity upon catalog entry',
        },
      });
    }

    await recordAudit('Create Product', 'Inventory', req.user?.name || 'Admin', { id: product.id, name: product.name });
    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { sku, name, category, flavor, unit, dealerPrice, sellingPrice, srp, minStock, barcode, isActive } = req.body;
  try {
    if (sku !== undefined) {
      const duplicate = await prisma.product.findFirst({ where: { id: { not: id }, sku: String(sku).trim() } });
      if (duplicate) return res.status(409).json({ error: 'This product SKU is already in use.' });
    }
    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku: sku === undefined ? undefined : String(sku).trim(),
        name: name?.trim(),
        category: category?.trim(),
        flavor: flavor !== undefined ? (flavor?.trim() || null) : undefined,
        unit,
        dealerPrice: dealerPrice !== undefined ? Number(dealerPrice) : undefined,
        sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : undefined,
        srp: srp !== undefined ? Number(srp) : undefined,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        barcode,
        isActive,
      },
    });

    await recordAudit('Update Product', 'Inventory', req.user?.name || 'Admin', { id, name: updated.name });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/adjust (Inventory count adjustment)
router.post('/adjust', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { productId, newPhysicalStock, reason, notes } = req.body;
  try {
    if (!productId || newPhysicalStock === undefined || !reason) {
      return res.status(400).json({ error: 'Product ID, new physical stock count, and reason are required.' });
    }
    const targetStock = Number(newPhysicalStock);
    if (!Number.isInteger(targetStock) || targetStock < 0) {
      return res.status(400).json({ error: 'Physical stock must be a whole number of zero or more.' });
    }
    const adjustment = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: String(productId) } });
      if (!product) throw new Error('PRODUCT_NOT_FOUND');
      const changeQty = targetStock - product.stock;
      const updated = await tx.product.update({ where: { id: product.id }, data: { stock: targetStock } });
      await tx.inventoryLedger.create({
        data: {
          productId: product.id,
          productName: product.name,
          movementType: 'Physical Adjustment',
          changeQty,
          runningSaleable: targetStock,
          runningQuarantine: product.quarantineStock,
          reference: `ADJ-${Date.now().toString().slice(-6)}`,
          staffName: req.user?.name || 'Staff',
          notes: `${reason} - ${notes || 'Stock count adjustment'}`,
        },
      });
      return { product, updated, changeQty };
    });

    await recordAudit('Stock Adjustment', 'Inventory', req.user?.name || 'Staff', {
      productId,
      oldStock: adjustment.product.stock,
      newStock: targetStock,
      changeQty: adjustment.changeQty,
      reason,
    });

    res.json({ success: true, product: adjustment.updated, changeQty: adjustment.changeQty });
  } catch (err: any) {
    if (err.message === 'PRODUCT_NOT_FOUND') return res.status(404).json({ error: 'Product not found.' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
