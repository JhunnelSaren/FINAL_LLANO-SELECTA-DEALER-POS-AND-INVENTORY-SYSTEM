import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/invoices
router.get('/', authenticateToken, async (req, res: Response) => {
  const { paymentStatus, customerId, search, dateFrom, dateTo } = req.query;
  try {
    const where: any = {};
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = String(paymentStatus);
    }
    if (customerId) {
      where.customerId = String(customerId);
    }
    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { storeName: { contains: q } },
      ];
    }
    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) {
        const from = new Date(`${String(dateFrom)}T00:00:00+08:00`);
        if (!Number.isFinite(from.getTime())) return res.status(400).json({ error: 'Enter a valid start date.' });
        dateFilter.gte = from;
      }
      if (dateTo) {
        const toExclusive = new Date(`${String(dateTo)}T00:00:00+08:00`);
        if (!Number.isFinite(toExclusive.getTime())) return res.status(400).json({ error: 'Enter a valid end date.' });
        toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
        dateFilter.lt = toExclusive;
      }
      where.invoiceDate = dateFilter;
    }

    const invoices = await prisma.customerInvoice.findMany({
      where,
      include: {
        payments: true,
        deliveryStop: {
          include: {
            items: true,
            deliveryRun: true,
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticateToken, async (req, res: Response) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        payments: true,
        deliveryStop: {
          include: {
            items: true,
            deliveryRun: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const settings = await prisma.systemSetting.findFirst();

    res.json({
      invoice,
      settings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/payments
router.post('/:id/payments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, paymentMethod, referenceNumber, bankName, checkDate, checkStatus, notes } = req.body;
  try {
    const invoice = await prisma.customerInvoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }
    if (payAmount > invoice.balanceRemaining) return res.status(400).json({ error: 'Payment amount cannot exceed the remaining invoice balance.' });
    if (!['Cash', 'GCash', 'Check', 'Bank Transfer'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Choose Cash, GCash, or Check as the payment method.' });
    }
    if (['GCash', 'Check', 'Bank Transfer'].includes(paymentMethod) && !referenceNumber?.trim()) {
      return res.status(400).json({ error: 'Enter a payment reference number.' });
    }
    if (paymentMethod === 'Check' && (!bankName?.trim() || !checkDate || !Number.isFinite(new Date(checkDate).getTime()))) {
      return res.status(400).json({ error: 'Enter the bank name and valid check date.' });
    }

    // Check duplicate reference if provided
    if (referenceNumber) {
      const dup = await prisma.paymentTransaction.findFirst({
        where: { referenceNumber: referenceNumber.trim() },
      });
      if (dup) {
        return res.status(400).json({ error: `Payment reference "${referenceNumber}" already exists in the system.` });
      }
    }

    const paymentStatus = paymentMethod === 'Check' ? (checkStatus || 'Pending') : 'Cleared';
    const { payment, updatedInvoice } = await prisma.$transaction(async tx => {
      const currentInvoice = await tx.customerInvoice.findUnique({ where: { id }, include: { payments: true } });
      if (!currentInvoice) throw new Error('INVOICE_NOT_FOUND');
      if (payAmount > currentInvoice.balanceRemaining) throw new Error('PAYMENT_EXCEEDS_BALANCE');
      if (referenceNumber?.trim()) {
        const duplicateReference = await tx.paymentTransaction.findFirst({ where: { referenceNumber: referenceNumber.trim() } });
        if (duplicateReference) throw new Error('DUPLICATE_PAYMENT_REFERENCE');
      }
      const createdPayment = await tx.paymentTransaction.create({
        data: {
          invoiceId: currentInvoice.id,
          customerId: currentInvoice.customerId,
          amount: payAmount,
          paymentMethod,
          referenceNumber: referenceNumber?.trim() || null,
          bankName: bankName?.trim() || null,
          checkDate: checkDate ? new Date(checkDate) : null,
          checkStatus: paymentStatus,
          collectedBy: req.user?.name || 'Staff',
          notes: notes || null,
        },
      });
      const oldRecordedTotal = currentInvoice.payments.reduce((sum, row) => sum + row.amount, 0);
      const oldClearedTotal = currentInvoice.payments.reduce((sum, row) => sum + ((row.paymentMethod !== 'Check' || row.checkStatus === 'Cleared') ? row.amount : 0), 0);
      const unrecordedPaid = Math.max(0, currentInvoice.totalPaid - oldRecordedTotal);
      const newTotalPaid = Number((unrecordedPaid + oldClearedTotal + (paymentStatus === 'Cleared' ? payAmount : 0)).toFixed(2));
      const balance = Math.max(0, Number((currentInvoice.netAmountDue - newTotalPaid).toFixed(2)));
      const updated = await tx.customerInvoice.update({
        where: { id },
        data: { totalPaid: newTotalPaid, balanceRemaining: balance, paymentStatus: balance <= 0 ? 'Paid' : newTotalPaid > 0 ? 'Partial' : 'Unpaid' },
        include: { payments: true },
      });
      const customer = await tx.customer.findUnique({ where: { id: currentInvoice.customerId }, select: { currentBalance: true } });
      if (customer) await tx.customer.update({ where: { id: currentInvoice.customerId }, data: { currentBalance: Math.max(0, Number((customer.currentBalance - (newTotalPaid - currentInvoice.totalPaid)).toFixed(2))) } });
      return { payment: createdPayment, updatedInvoice: updated };
    });

    await recordAudit('Record Payment', 'Sales & Reports', req.user?.name || 'Staff', {
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      method: paymentMethod,
    });

    res.status(201).json({ payment, invoice: updatedInvoice });
  } catch (err: any) {
    if (err.message === 'INVOICE_NOT_FOUND') return res.status(404).json({ error: 'Invoice not found.' });
    if (err.message === 'PAYMENT_EXCEEDS_BALANCE') return res.status(400).json({ error: 'Payment amount cannot exceed the remaining invoice balance.' });
    if (err.message === 'DUPLICATE_PAYMENT_REFERENCE') return res.status(409).json({ error: `Payment reference "${referenceNumber}" already exists in the system.` });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/invoices/payments/:payId/check-status (Update check clearing status)
router.put('/payments/:payId/check-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { payId } = req.params;
  const { checkStatus } = req.body;
  try {
    if (!['Pending', 'Cleared', 'Bounced'].includes(checkStatus)) {
      return res.status(400).json({ error: 'Status must be Pending, Cleared, or Bounced.' });
    }

    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: payId },
      include: { invoice: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.paymentTransaction.update({ where: { id: payId }, data: { checkStatus } });
      const payments = await tx.paymentTransaction.findMany({ where: { invoiceId: payment.invoice.id } });
      const recordedTotal = payments.reduce((sum, row) => sum + row.amount, 0);
      const clearedTotal = payments.reduce((sum, row) => sum + ((row.paymentMethod !== 'Check' || row.checkStatus === 'Cleared') ? row.amount : 0), 0);
      const unrecordedPaid = Math.max(0, payment.invoice.totalPaid - recordedTotal);
      const totalPaid = Number((unrecordedPaid + clearedTotal).toFixed(2));
      const balance = Math.max(0, Number((payment.invoice.netAmountDue - totalPaid).toFixed(2)));
      await tx.customerInvoice.update({ where: { id: payment.invoice.id }, data: { totalPaid, balanceRemaining: balance, paymentStatus: balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid' } });
      const customer = await tx.customer.findUnique({ where: { id: payment.customerId }, select: { currentBalance: true } });
      if (customer) await tx.customer.update({ where: { id: payment.customerId }, data: { currentBalance: Math.max(0, Number((customer.currentBalance - (totalPaid - payment.invoice.totalPaid)).toFixed(2))) } });
      return changed;
    });

    await recordAudit('Update Check Status', 'Sales & Reports', req.user?.name || 'Staff', {
      payId,
      checkStatus,
      amount: payment.amount,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
