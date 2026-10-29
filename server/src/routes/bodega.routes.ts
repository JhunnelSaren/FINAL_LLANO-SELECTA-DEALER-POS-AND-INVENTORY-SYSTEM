import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/bodega-orders
router.get('/', authenticateToken, async (req, res: Response) => {
  const { status } = req.query;
  try {
    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }

    const orders = await prisma.bodegaOrder.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { orderDate: 'desc' },
    });

    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bodega-orders (Record official Selecta POS entry)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { selectaPosRef, orderDate, expectedArrivalDate, staffResponsible, notes, items } = req.body;
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one product line.' });
    }

    let totalItemsNeeded = 0;
    let totalAmount = 0;

    const validatedItems: {
      productId: string;
      productName: string;
      orderedQty: number;
      unitPrice: number;
    }[] = [];

    for (const line of items) {
      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        return res.status(400).json({ error: `Product ID "${line.productId}" not found.` });
      }
      const qty = parseInt(line.orderedQty, 10);
      if (isNaN(qty) || qty <= 0) continue;
      const unitPrice = Number(product.dealerPrice) || Number(product.sellingPrice);
      totalItemsNeeded += qty;
      totalAmount += qty * unitPrice;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        orderedQty: qty,
        unitPrice,
      });
    }

    const orderNumber = `ORD-BOD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const order = await prisma.bodegaOrder.create({
      data: {
        orderNumber,
        selectaPosRef: selectaPosRef?.trim() || null,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : new Date(Date.now() + 48 * 60 * 60 * 1000),
        staffResponsible: staffResponsible?.trim() || req.user?.name || 'Dealer Admin',
        status: selectaPosRef ? 'Entered in POS' : 'Pending Entry',
        totalItemsNeeded,
        totalAmount,
        notes: notes || null,
        items: {
          create: validatedItems,
        },
      },
      include: { items: true },
    });

    await recordAudit('Record Bodega Order', 'Bodega Order', req.user?.name || 'Staff', {
      orderNumber,
      selectaPosRef: order.selectaPosRef,
      totalUnits: totalItemsNeeded,
    });

    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bodega-orders/:id (Update Selecta POS ref / status)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { selectaPosRef, status, expectedArrivalDate, notes } = req.body;
  try {
    const updated = await prisma.bodegaOrder.update({
      where: { id },
      data: {
        selectaPosRef: selectaPosRef?.trim(),
        status,
        expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : undefined,
        notes,
      },
      include: { items: true },
    });

    await recordAudit('Update Bodega Order', 'Bodega Order', req.user?.name || 'Staff', { id, status: updated.status });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
