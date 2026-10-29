import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, recordAudit, AuthenticatedRequest } from '../auth.js';
import { upload } from '../upload.js';
import { deactivateDormantCustomers } from '../customers.service.js';

const router = Router();

// GET /api/customers
router.get('/', authenticateToken, async (req, res: Response) => {
  const { area, route, search, status } = req.query;
  try {
    await deactivateDormantCustomers();
    const where: any = {};
    if (area && area !== 'all') {
      where.area = String(area);
    }
    if (route && route !== 'all') {
      where.route = String(route);
    }
    if (status && status !== 'all') where.status = String(status);
    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      where.OR = [
        { storeName: { contains: q } },
        { ownerName: { contains: q } },
        { id: { contains: q } },
        { subArea: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        freezers: {
          select: {
            id: true,
            serialNumber: true,
            barcode: true,
            model: true,
            status: true,
          },
        },
      },
      orderBy: { storeName: 'asc' },
    });

    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', authenticateToken, upload.single('storePhoto'), async (req: AuthenticatedRequest, res: Response) => {
  const { id, storeName, ownerName, contact, area, subArea, purok, route, address, notes, freezerSerial, dateAdded } = req.body;
  try {
    if (!storeName || !area) {
      return res.status(400).json({ error: 'Store name and area are required.' });
    }

    // Check duplicate store name in same area
    const duplicate = await prisma.customer.findFirst({
      where: {
        storeName: storeName.trim(),
        area: area.trim(),
      },
    });

    if (duplicate) {
      return res.status(400).json({ error: `A store named "${storeName}" is already registered in ${area}.` });
    }

    const customerId = id || `CUST-${Date.now().toString().slice(-4)}`;

    const addedAt = dateAdded ? new Date(dateAdded) : new Date();
    if (!Number.isFinite(addedAt.getTime())) return res.status(400).json({ error: 'Enter a valid store registration date.' });

    const customer = await prisma.customer.create({
      data: {
        id: customerId,
        storeName: storeName.trim(),
        ownerName: ownerName?.trim() || storeName.trim(),
        contact: contact?.trim() || null,
        area: area.trim(),
        subArea: subArea?.trim() || null,
        purok: purok?.trim() || null,
        route: route?.trim() || area.trim(),
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        freezerSerial: freezerSerial || null,
        dateAdded: addedAt,
        lastOrderAt: addedAt,
        storePhotoPath: req.file ? `/uploads/${req.file.filename}` : null,
      },
    });

    // If a freezer serial was assigned, link it if found
    if (freezerSerial) {
      await prisma.freezer.updateMany({
        where: { serialNumber: freezerSerial },
        data: {
          assignedStoreId: customer.id,
          assignedStoreName: customer.storeName,
          assignedOwner: customer.ownerName,
          area: customer.area,
        },
      });
    }

    await recordAudit('Create Store', 'Stores', req.user?.name || 'Staff', { id: customer.id, storeName: customer.storeName });
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, upload.single('storePhoto'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { storeName, ownerName, contact, area, subArea, purok, route, address, notes, status, freezerSerial, dateAdded } = req.body;
  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        storeName: storeName?.trim(),
        ownerName: ownerName?.trim(),
        contact: contact?.trim(),
        area: area?.trim(),
        subArea: subArea?.trim(),
        purok: purok?.trim(),
        route: route?.trim() || area?.trim() || undefined,
        address: address?.trim(),
        notes: notes?.trim(),
        status,
        lastOrderAt: status === 'Active' ? new Date() : undefined,
        freezerSerial,
        dateAdded: dateAdded ? new Date(dateAdded) : undefined,
        storePhotoPath: req.file ? `/uploads/${req.file.filename}` : undefined,
      },
    });

    await recordAudit('Update Store', 'Stores', req.user?.name || 'Staff', { id, storeName: updated.storeName });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id/history
router.get('/:id/history', authenticateToken, async (req, res: Response) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        freezers: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer store not found.' });
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: id },
      include: { items: true },
      orderBy: { bookingDate: 'desc' },
      take: 20,
    });

    const invoices = await prisma.customerInvoice.findMany({
      where: { customerId: id },
      include: { payments: true },
      orderBy: { invoiceDate: 'desc' },
      take: 20,
    });

    const boDiscrepancies = await prisma.boDiscrepancy.findMany({
      where: { OR: [{ customerId: id }, { storeName: customer.storeName }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      customer,
      bookings,
      invoices,
      boDiscrepancies,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
