import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole, recordAudit, AuthenticatedRequest } from '../auth.js';
import { manilaMonthYear } from '../business-time.js';

const router = Router();

// GET /api/quota (current month or query ?month=)
router.get('/', authenticateToken, async (req, res: Response) => {
  const currentMonth = manilaMonthYear();
  const monthYear = (req.query.month as string) || (req.query.monthYear as string) || currentMonth;
  try {
    let quota = await prisma.selectaPosQuota.findUnique({
      where: { monthYear },
      include: {
        entries: { orderBy: { entryDate: 'desc' } },
      },
    });

    if (!quota) {
      const settings = await prisma.systemSetting.findFirst();
      const defaultTarget = settings?.defaultQuotaTarget || 1000000.00;

      quota = await prisma.selectaPosQuota.create({
        data: {
          monthYear,
          targetAmount: defaultTarget,
          recordedSales: 0.0,
        },
        include: { entries: true },
      });
    }

    const target = quota.targetAmount;
    const achieved = quota.recordedSales;
    const percentage = target > 0 ? Number(((achieved / target) * 100).toFixed(1)) : 0;
    const remaining = Math.max(0, Number((target - achieved).toFixed(2)));

    res.json({
      ...quota,
      target,
      achieved,
      percentage,
      remaining,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quota/:monthYear
router.get('/:monthYear', authenticateToken, async (req, res: Response) => {
  const { monthYear } = req.params;
  try {
    let quota = await prisma.selectaPosQuota.findUnique({
      where: { monthYear },
      include: {
        entries: { orderBy: { entryDate: 'desc' } },
      },
    });

    if (!quota) {
      // Find system default target
      const settings = await prisma.systemSetting.findFirst();
      const defaultTarget = settings?.defaultQuotaTarget || 1000000.00;

      quota = await prisma.selectaPosQuota.create({
        data: {
          monthYear,
          targetAmount: defaultTarget,
          recordedSales: 0.0,
        },
        include: { entries: true },
      });
    }

    const target = quota.targetAmount;
    const achieved = quota.recordedSales;
    const percentage = target > 0 ? Number(((achieved / target) * 100).toFixed(1)) : 0;
    const remaining = Math.max(0, Number((target - achieved).toFixed(2)));

    res.json({
      ...quota,
      target,
      achieved,
      percentage,
      remaining,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quota/target (Admin update monthly quota target)
router.post('/target', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const { monthYear, targetAmount, notes } = req.body;
  try {
    if (!monthYear || targetAmount === undefined) {
      return res.status(400).json({ error: 'Month-Year (YYYY-MM) and target amount are required.' });
    }

    const updated = await prisma.selectaPosQuota.upsert({
      where: { monthYear },
      update: {
        targetAmount: Number(targetAmount),
        notes: notes || undefined,
      },
      create: {
        monthYear,
        targetAmount: Number(targetAmount),
        recordedSales: 0.0,
        notes: notes || null,
      },
      include: { entries: true },
    });

    await recordAudit('Update Quota Target', 'Quota', req.user?.name || 'Admin', { monthYear, target: targetAmount });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quota/entry (Record official Selecta POS sales figure)
router.post('/entry', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { monthYear, selectaPosRef, amount, entryDate, remarks } = req.body;
  try {
    if (!monthYear || !selectaPosRef || amount === undefined) {
      return res.status(400).json({ error: 'Month-Year, official Selecta POS reference, and amount are required.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Sales amount must be greater than zero.' });
    }

    let quota = await prisma.selectaPosQuota.findUnique({ where: { monthYear } });
    if (!quota) {
      const settings = await prisma.systemSetting.findFirst();
      quota = await prisma.selectaPosQuota.create({
        data: {
          monthYear,
          targetAmount: settings?.defaultQuotaTarget || 1000000.00,
          recordedSales: 0.0,
        },
      });
    }

    const entry = await prisma.selectaPosQuotaEntry.create({
      data: {
        quotaId: quota.id,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        selectaPosRef: selectaPosRef.trim(),
        amount: numAmount,
        enteredBy: req.user?.name || 'Staff',
        remarks: remarks || null,
      },
    });

    // Update sum of confirmed Selecta entries
    const allEntries = await prisma.selectaPosQuotaEntry.findMany({ where: { quotaId: quota.id } });
    const newTotal = allEntries.reduce((sum, e) => sum + e.amount, 0);

    const updatedQuota = await prisma.selectaPosQuota.update({
      where: { id: quota.id },
      data: { recordedSales: newTotal },
      include: { entries: { orderBy: { entryDate: 'desc' } } },
    });

    await recordAudit('Record Selecta POS Sales', 'Quota', req.user?.name || 'Staff', {
      monthYear,
      ref: selectaPosRef,
      amount: numAmount,
    });

    res.status(201).json({
      entry,
      quota: updatedQuota,
      percentage: Number(((newTotal / updatedQuota.targetAmount) * 100).toFixed(1)),
      remaining: Math.max(0, updatedQuota.targetAmount - newTotal),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
