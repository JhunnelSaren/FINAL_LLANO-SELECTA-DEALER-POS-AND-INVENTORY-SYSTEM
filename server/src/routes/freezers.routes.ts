import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';
import { upload } from '../upload.js';

const router = Router();

// GET /api/freezers
router.get('/', authenticateToken, async (req, res: Response) => {
  const { status, area, search, customerId } = req.query;
  try {
    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (area && area !== 'all') {
      where.AND = [...(where.AND || []), { OR: [
        { customer: { is: { area: String(area) } } },
        { assignedStoreId: null, area: String(area) },
      ] }];
    }
    if (customerId) where.assignedStoreId = String(customerId);
    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      where.OR = [
        { serialNumber: { contains: q } },
        { barcode: { contains: q } },
        { assignedStoreName: { contains: q } },
        { customer: { is: { storeName: { contains: q } } } },
        { model: { contains: q } },
      ];
    }

    const freezers = await prisma.freezer.findMany({
      where,
      include: {
        customer: true,
        verifications: {
          orderBy: { scannedAt: 'desc' },
          take: 5,
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 25 },
      },
      orderBy: { serialNumber: 'asc' },
    });

    const now = new Date();
    const enriched = freezers.map((f) => {
      let verificationStatus = 'Up to Date';
      if (!f.nextDueAt) {
        verificationStatus = 'Due';
      } else {
        const dueDate = new Date(f.nextDueAt);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          verificationStatus = 'Overdue';
        } else if (diffDays <= 7) {
          verificationStatus = 'Due Soon';
        }
      }
      return {
        ...f,
        assignedStoreName: f.customer?.storeName ?? f.assignedStoreName,
        assignedOwner: f.customer?.ownerName ?? f.assignedOwner,
        area: f.customer?.area ?? f.area,
        verificationStatus,
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/freezers (Register Selecta freezer asset)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { serialNumber, barcode, model, assignedStoreId, area, condition, notes, totalFee, productAllocation, processingFee, feePaymentRef } = req.body;
  try {
    if (!serialNumber || !barcode || !model) {
      return res.status(400).json({ error: 'Serial number, barcode, and model are required.' });
    }

    const existing = await prisma.freezer.findFirst({
      where: {
        OR: [{ serialNumber: serialNumber.trim() }, { barcode: barcode.trim() }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Freezer with this serial number or barcode already exists.' });
    }

    let assignedStoreName: string | null = null;
    let assignedOwner: string | null = null;
    let assignedCustomer: Awaited<ReturnType<typeof prisma.customer.findUnique>> = null;

    if (assignedStoreId) {
      assignedCustomer = await prisma.customer.findUnique({ where: { id: assignedStoreId } });
      if (!assignedCustomer || assignedCustomer.status !== 'Active') return res.status(400).json({ error: 'Choose an active store for this freezer.' });
      assignedStoreName = assignedCustomer.storeName;
      assignedOwner = assignedCustomer.ownerName;
    }

    const nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const freezer = await prisma.$transaction(async tx => {
      const created = await tx.freezer.create({
        data: {
          id: `FRZ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          serialNumber: serialNumber.trim(),
          barcode: barcode.trim(),
          model: model.trim(),
          assignedStoreId: assignedStoreId || null,
          assignedStoreName,
          assignedOwner,
          area: assignedCustomer?.area || area || 'Valencia',
          status: assignedStoreId ? 'Active' : 'Unassigned',
          custodyDate: new Date(),
          totalFee: Number(totalFee) || 10000.00,
          productAllocation: Number(productAllocation) || 9000.00,
          processingFee: Number(processingFee) || 1000.00,
          feePaymentRef: feePaymentRef || null,
          condition: condition || 'Good',
          nextDueAt: nextDueDate,
          notes: notes || null,
        },
      });
      await tx.freezerTransaction.create({
        data: {
          freezerId: created.id,
          action: assignedCustomer ? 'Assigned' : 'Registered',
          toCustomerId: assignedCustomer?.id,
          toStoreName: assignedCustomer?.storeName,
          toArea: assignedCustomer?.area,
          reason: assignedCustomer ? 'Freezer assigned during registration.' : 'Freezer registered as unassigned.',
          performedBy: req.user?.name || 'Staff',
        },
      });
      if (assignedCustomer) await tx.customer.update({ where: { id: assignedCustomer.id }, data: { freezerSerial: created.serialNumber } });
      return created;
    });

    await recordAudit('Register Freezer', 'Freezers', req.user?.name || 'Staff', { serialNumber: freezer.serialNumber });
    res.status(201).json(freezer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/freezers/:id
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { serialNumber, barcode, model, assignedStoreId, area, custodyDate, status, condition, notes, totalFee, productAllocation, processingFee, feePaymentStatus, feePaymentRef } = req.body;
  try {
    let assignedStoreName: string | null = undefined as any;
    let assignedOwner: string | null = undefined as any;

    if (assignedStoreId !== undefined) {
      if (assignedStoreId) {
        const store = await prisma.customer.findUnique({ where: { id: assignedStoreId } });
        if (store) {
          assignedStoreName = store.storeName;
          assignedOwner = store.ownerName;
        }
      } else {
        assignedStoreName = null;
        assignedOwner = null;
      }
    }

    const previous = await prisma.freezer.findUnique({ where: { id } });
    if (!previous) return res.status(404).json({ error: 'Freezer not found.' });
    if (assignedStoreId && assignedStoreId !== previous.assignedStoreId) {
      const destination = await prisma.customer.findUnique({ where: { id: assignedStoreId } });
      if (!destination || destination.status !== 'Active') return res.status(400).json({ error: 'Choose an active store for this freezer.' });
    }
    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.freezer.update({
        where: { id },
        data: {
          serialNumber: serialNumber?.trim(),
          barcode: barcode?.trim(),
          model: model?.trim(),
          area: area || undefined,
          custodyDate: custodyDate ? new Date(custodyDate) : undefined,
          assignedStoreId: assignedStoreId !== undefined ? (assignedStoreId || null) : undefined,
          assignedStoreName,
          assignedOwner,
          status,
          condition,
          notes,
          totalFee: totalFee !== undefined ? Number(totalFee) : undefined,
          productAllocation: productAllocation !== undefined ? Number(productAllocation) : undefined,
          processingFee: processingFee !== undefined ? Number(processingFee) : undefined,
          feePaymentStatus,
          feePaymentRef,
        },
      });
      const assignmentChanged = assignedStoreId !== undefined && assignedStoreId !== previous.assignedStoreId;
      const statusChanged = status !== undefined && status !== previous.status;
      const areaChanged = area !== undefined && area !== previous.area;
      if (assignmentChanged || statusChanged || areaChanged) {
        const destinationId = assignedStoreId === undefined ? previous.assignedStoreId : assignedStoreId;
        const destination = destinationId ? await tx.customer.findUnique({ where: { id: destinationId } }) : null;
        if (assignmentChanged && previous.assignedStoreId) await tx.customer.updateMany({ where: { id: previous.assignedStoreId, freezerSerial: previous.serialNumber }, data: { freezerSerial: null } });
        if (assignmentChanged && destination) await tx.customer.update({ where: { id: destination.id }, data: { freezerSerial: changed.serialNumber } });
        await tx.freezerTransaction.create({
          data: {
            freezerId: id,
            action: assignmentChanged ? (destination ? 'Assignment Updated' : 'Unassigned') : statusChanged ? 'Status Updated' : 'Area Updated',
            fromCustomerId: previous.assignedStoreId,
            fromStoreName: previous.assignedStoreName,
            fromArea: previous.area,
            toCustomerId: destination?.id,
            toStoreName: destination?.storeName,
            toArea: destination?.area,
            reason: 'Details updated in the freezer edit form.',
            performedBy: req.user?.name || 'Staff',
          },
        });
      }
      if (serialNumber && serialNumber.trim() !== previous.serialNumber && previous.assignedStoreId) {
        await tx.customer.updateMany({ where: { id: previous.assignedStoreId, freezerSerial: previous.serialNumber }, data: { freezerSerial: serialNumber.trim() } });
      }
      return changed;
    });

    await recordAudit('Update Freezer', 'Freezers', req.user?.name || 'Staff', { id, serial: updated.serialNumber });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/transfer', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const customerId = String(req.body.customerId || '').trim();
  const reason = String(req.body.reason || '').trim();
  if (!customerId || !reason) return res.status(400).json({ error: 'Choose a destination store and enter a transfer reason.' });
  try {
    const freezer = await prisma.freezer.findUnique({ where: { id } });
    const destination = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!freezer) return res.status(404).json({ error: 'Freezer not found.' });
    if (!destination || destination.status !== 'Active') return res.status(400).json({ error: 'Choose an active destination store.' });
    if (destination.id === freezer.assignedStoreId) return res.status(400).json({ error: 'Choose a different destination store.' });
    if (freezer.status === 'Damaged') return res.status(409).json({ error: 'A damaged freezer must be repaired before it can be transferred.' });
    const updated = await prisma.$transaction(async tx => {
      if (freezer.assignedStoreId) await tx.customer.updateMany({ where: { id: freezer.assignedStoreId, freezerSerial: freezer.serialNumber }, data: { freezerSerial: null } });
      const result = await tx.freezer.update({ where: { id }, data: { assignedStoreId: destination.id, assignedStoreName: destination.storeName, assignedOwner: destination.ownerName, area: destination.area, status: 'Active', custodyDate: new Date() } });
      await tx.customer.update({ where: { id: destination.id }, data: { freezerSerial: freezer.serialNumber } });
      await tx.freezerTransaction.create({ data: { freezerId: id, action: 'Transfer', fromCustomerId: freezer.assignedStoreId, fromStoreName: freezer.assignedStoreName, fromArea: freezer.area, toCustomerId: destination.id, toStoreName: destination.storeName, toArea: destination.area, reason, performedBy: req.user?.name || 'Staff' } });
      return result;
    });
    await recordAudit('Transfer Freezer', 'Freezers', req.user?.name || 'Staff', { freezerId: id, serialNumber: freezer.serialNumber, fromStore: freezer.assignedStoreName, toStore: destination.storeName, reason });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/pull-out', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Enter why the freezer is being pulled out.' });
  try {
    const freezer = await prisma.freezer.findUnique({ where: { id } });
    if (!freezer) return res.status(404).json({ error: 'Freezer not found.' });
    const updated = await prisma.$transaction(async tx => {
      if (freezer.assignedStoreId) await tx.customer.updateMany({ where: { id: freezer.assignedStoreId, freezerSerial: freezer.serialNumber }, data: { freezerSerial: null } });
      const result = await tx.freezer.update({ where: { id }, data: { assignedStoreId: null, assignedStoreName: null, assignedOwner: null, status: 'Returned' } });
      await tx.freezerTransaction.create({ data: { freezerId: id, action: 'Pull Out', fromCustomerId: freezer.assignedStoreId, fromStoreName: freezer.assignedStoreName, fromArea: freezer.area, reason, performedBy: req.user?.name || 'Staff' } });
      return result;
    });
    await recordAudit('Pull Out Freezer', 'Freezers', req.user?.name || 'Staff', { freezerId: id, serialNumber: freezer.serialNumber, fromStore: freezer.assignedStoreName, reason });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/damaged', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Describe the freezer damage.' });
  try {
    const freezer = await prisma.freezer.findUnique({ where: { id } });
    if (!freezer) return res.status(404).json({ error: 'Freezer not found.' });
    if (freezer.status === 'Damaged') return res.status(409).json({ error: 'This freezer is already marked as damaged.' });
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.freezer.update({ where: { id }, data: { status: 'Damaged', condition: 'Damaged' } });
      await tx.freezerTransaction.create({ data: { freezerId: id, action: 'Damaged', fromCustomerId: freezer.assignedStoreId, fromStoreName: freezer.assignedStoreName, fromArea: freezer.area, reason, performedBy: req.user?.name || 'Staff' } });
      return result;
    });
    await recordAudit('Report Freezer Damage', 'Freezers', req.user?.name || 'Staff', { freezerId: id, serialNumber: freezer.serialNumber, store: freezer.assignedStoreName, reason });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/freezers/:id/verify (Record monthly Timemark verification)
router.post('/:id/verify', authenticateToken, upload.single('photo'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { verificationMonth, scannedAt, barcodeScanned, staffName, notes } = req.body;
  try {
    const freezer = await prisma.freezer.findUnique({ where: { id } });
    if (!freezer) {
      return res.status(404).json({ error: 'Freezer not found.' });
    }

    const monthStr = verificationMonth || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7); // e.g. "2026-10"

    // Check duplicate monthly scan for the same period
    const existingScan = await prisma.freezerVerification.findFirst({
      where: {
        freezerId: id,
        verificationMonth: monthStr,
        status: { in: ['Verified', 'Pending Review'] },
      },
    });

    if (existingScan && req.user?.role !== 'Admin') {
      return res.status(409).json({
        error: `A monthly verification for period ${monthStr} has already been recorded for this freezer (Scan ID: ${existingScan.id}). Authorized corrections require Dealer Admin privileges.`,
      });
    }

    const scannedBarcode = String(barcodeScanned || req.body.barcode || '').trim();
    if (!scannedBarcode) return res.status(400).json({ error: 'Scan or enter the freezer barcode.' });
    if (scannedBarcode !== freezer.barcode) return res.status(400).json({ error: 'The scanned barcode does not match this freezer.' });

    const scanDate = scannedAt ? new Date(scannedAt) : new Date();
    if (!Number.isFinite(scanDate.getTime())) return res.status(400).json({ error: 'Enter a valid verification date and time.' });
    // 30 days after scan is the next due date
    const nextDueDate = new Date(scanDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const photoPath = req.file ? `/uploads/${req.file.filename}` : '/uploads/sample_freezer_barcode.png';

    const verification = await prisma.freezerVerification.create({
      data: {
        freezerId: id,
        verificationMonth: monthStr,
        scannedAt: scanDate,
        barcodeScanned: scannedBarcode,
        staffName: (staffName || req.user?.name || 'Staff').trim(),
        photoPath,
        status: 'Verified',
        notes: notes || 'Timemark scan uploaded and recorded',
        verifiedBy: req.user?.name || 'Dealer Admin',
      },
    });

    // Update freezer lastVerifiedAt and nextDueAt
    await prisma.freezer.update({
      where: { id },
      data: {
        lastVerifiedAt: scanDate,
        nextDueAt: nextDueDate,
      },
    });

    await recordAudit('Verify Freezer Barcode', 'Freezers', req.user?.name || 'Staff', {
      freezerId: id,
      serial: freezer.serialNumber,
      month: monthStr,
    });

    res.status(201).json(verification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/freezers/verifications/:verId/review (Review/Reject verification photo)
router.put('/verifications/:verId/review', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { verId } = req.params;
  const { status, reviewNotes } = req.body;
  try {
    const updated = await prisma.freezerVerification.update({
      where: { id: verId },
      data: {
        status, // "Verified" | "Rejected"
        notes: reviewNotes ? `Review Note: ${reviewNotes}` : undefined,
        verifiedBy: req.user?.name || 'Dealer Admin',
      },
    });

    await recordAudit('Review Freezer Verification', 'Freezers', req.user?.name || 'Staff', { verificationId: verId, status });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
