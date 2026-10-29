import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING LLANO SELECTA DEALER DATABASE ---');

  // 1. SYSTEM SETTINGS
  await prisma.systemSetting.upsert({
    where: { id: 'SYSTEM_SETTINGS' },
    update: {},
    create: {
      id: 'SYSTEM_SETTINGS',
      dealerName: 'Llano Selecta Dealer',
      address: 'Sayre Highway, Valencia City, Bukidnon',
      contactNumber: '0917-123-4567',
      receiptHeader: 'Llano Selecta Authorized Dealer - Cold Chain Ice Cream Distribution',
      defaultQuotaTarget: 1000000.00,
      freezerTotalFee: 10000.00,
      freezerProductAllocation: 9000.00,
      freezerProcessingFee: 1000.00,
      mondayRoute: 'Valencia – San Fernando Route',
      tuesdayRoute: 'Cabanglasan Delivery Route',
      wednesdayActivity: 'Selecta Bodega Stock Arrival & Verification',
      thursdayRoute: 'Cabanglasan Bongo Delivery Run',
      fridayRoute: 'Valencia – San Fernando Bongo Delivery Run',
      allowNegativeStock: false,
    },
  });
  console.log('✓ System settings initialized');

  // 2. USERS
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('admin123', salt);
  const staffHash = await bcrypt.hash('staff123', salt);

  const usersData = [
    {
      id: 'USR-ADMIN',
      username: 'admin',
      name: 'Dealer Admin (Owner)',
      email: 'admin@selecta.com',
      role: 'Admin',
      accessKey: 'SELECTA-ADMIN-2026',
      passwordHash: adminHash,
      phone: '0917-000-0001',
      status: 'Active',
    },
    {
      id: 'USR-STAFF',
      username: 'staff',
      name: 'Dealer Operations Staff',
      email: 'staff@selecta.com',
      role: 'Staff',
      accessKey: 'SELECTA-STAFF-2026',
      passwordHash: staffHash,
      phone: '0917-000-0002',
      status: 'Active',
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: u.passwordHash, name: u.name, role: u.role },
      create: u,
    });
  }
  console.log('✓ Users initialized (Admin: admin / admin123, Staff: staff / staff123)');

  // 3. PRODUCTS
  const products = [
    { id: 'COR-001', sku: 'COR-001', name: 'CHOCOLATE (CORNETTO)', category: 'CORNETTO', unit: 'Piece', dealerPrice: 24.50, sellingPrice: 28.00, srp: 35.00, stock: 240, quarantineStock: 5, reservedStock: 30, minStock: 50, barcode: '480001600101' },
    { id: 'COR-002', sku: 'COR-002', name: 'VANILLA (CORNETTO)', category: 'CORNETTO', unit: 'Piece', dealerPrice: 24.50, sellingPrice: 28.00, srp: 35.00, stock: 195, quarantineStock: 0, reservedStock: 25, minStock: 50, barcode: '480001600102' },
    { id: 'COR-003', sku: 'COR-003', name: 'COOKIES & DREAM (CORNETTO)', category: 'CORNETTO', unit: 'Piece', dealerPrice: 24.50, sellingPrice: 28.00, srp: 35.00, stock: 160, quarantineStock: 2, reservedStock: 40, minStock: 40, barcode: '480001600103' },
    { id: 'MAG-001', sku: 'MAG-001', name: 'CLASSIC (MAGNUM)', category: 'MAGNUM', unit: 'Piece', dealerPrice: 56.00, sellingPrice: 65.00, srp: 75.00, stock: 110, quarantineStock: 0, reservedStock: 15, minStock: 30, barcode: '480001600201' },
    { id: 'MAG-002', sku: 'MAG-002', name: 'ALMOND (MAGNUM)', category: 'MAGNUM', unit: 'Piece', dealerPrice: 56.00, sellingPrice: 65.00, srp: 75.00, stock: 95, quarantineStock: 1, reservedStock: 20, minStock: 30, barcode: '480001600202' },
    { id: 'MAG-003', sku: 'MAG-003', name: 'WHITE ALMOND (MAGNUM)', category: 'MAGNUM', unit: 'Piece', dealerPrice: 56.00, sellingPrice: 65.00, srp: 75.00, stock: 85, quarantineStock: 0, reservedStock: 0, minStock: 25, barcode: '480001600203' },
    { id: 'STK-001', sku: 'STK-001', name: 'COOKIES & CREAM (STICKS)', category: 'STICKS', unit: 'Pack', dealerPrice: 215.00, sellingPrice: 248.20, srp: 275.00, stock: 75, quarantineStock: 0, reservedStock: 10, minStock: 25, barcode: '480001600001' },
    { id: 'STK-002', sku: 'STK-002', name: 'CHOCO BERRY (STICKS)', category: 'STICKS', unit: 'Pack', dealerPrice: 215.00, sellingPrice: 248.20, srp: 275.00, stock: 60, quarantineStock: 0, reservedStock: 5, minStock: 20, barcode: '480001600002' },
    { id: 'SUP-001', sku: 'SUP-001', name: 'DOUBLE DUTCH 1.3L', category: 'SUPREME 1.3L', unit: 'Tub', dealerPrice: 228.00, sellingPrice: 260.00, srp: 299.00, stock: 55, quarantineStock: 2, reservedStock: 10, minStock: 15, barcode: '480001600301' },
    { id: 'SUP-002', sku: 'SUP-002', name: 'ROCKY ROAD 1.3L', category: 'SUPREME 1.3L', unit: 'Tub', dealerPrice: 228.00, sellingPrice: 260.00, srp: 299.00, stock: 48, quarantineStock: 1, reservedStock: 8, minStock: 15, barcode: '480001600302' },
    { id: 'SUP-003', sku: 'SUP-003', name: 'COOKIES & CREAM 1.3L', category: 'SUPREME 1.3L', unit: 'Tub', dealerPrice: 228.00, sellingPrice: 260.00, srp: 299.00, stock: 52, quarantineStock: 0, reservedStock: 12, minStock: 15, barcode: '480001600303' },
    { id: 'SUP-004', sku: 'SUP-004', name: 'QUEZO REAL 1.3L', category: 'SUPREME 1.3L', unit: 'Tub', dealerPrice: 228.00, sellingPrice: 260.00, srp: 299.00, stock: 38, quarantineStock: 0, reservedStock: 6, minStock: 15, barcode: '480001600304' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  console.log(`✓ Products initialized (${products.length} Selecta SKUs)`);

  // 4. CUSTOMERS & STORES
  const customers = [
    {
      id: 'CUST-001',
      storeName: 'Aling Nena Sari-Sari Store',
      ownerName: 'Nena Dela Cruz',
      contact: '0917-123-4567',
      area: 'Valencia',
      subArea: 'Batangan',
      purok: 'Purok 2',
      route: 'Valencia City Route (Batangan)',
      address: 'Purok 2, Batangan, Valencia City',
      freezerSerial: 'SEL-FRZ-8821',
      barcodeNo: 'BC-8821-VAL',
      status: 'Active',
      currentBalance: 0.0,
      notes: 'Near Batangan Elementary School',
    },
    {
      id: 'CUST-002',
      storeName: 'San Isidro Mini-Mart',
      ownerName: 'Maria Clara',
      contact: '0918-234-5678',
      area: 'Valencia',
      subArea: 'San Isidro',
      purok: 'Purok 1',
      route: 'Valencia City Route (San Isidro)',
      address: 'San Isidro Junction, Valencia City',
      freezerSerial: 'SEL-FRZ-8822',
      barcodeNo: 'BC-8822-VAL',
      status: 'Active',
      currentBalance: 1250.00,
      notes: 'Morning delivery preferred before 10 AM',
    },
    {
      id: 'CUST-003',
      storeName: 'Cabanglasan Highland Corner',
      ownerName: 'Ramon Santos',
      contact: '0919-345-6789',
      area: 'Cabanglasan',
      subArea: 'Poblacion',
      purok: 'Purok 3',
      route: 'Cabanglasan Delivery Route',
      address: 'Public Market Site, Poblacion, Cabanglasan',
      freezerSerial: 'SEL-FRZ-9011',
      barcodeNo: 'BC-9011-CAB',
      status: 'Active',
      currentBalance: 0.0,
      notes: 'Payment via cash upon arrival',
    },
    {
      id: 'CUST-004',
      storeName: 'Paradise Valley Store',
      ownerName: 'Juanita Morales',
      contact: '0928-888-1234',
      area: 'Cabanglasan',
      subArea: 'Paradise',
      purok: 'Purok 4',
      route: 'Cabanglasan Delivery Route',
      address: 'Barangay Paradise, Cabanglasan',
      freezerSerial: 'SEL-FRZ-9015',
      barcodeNo: 'BC-9015-CAB',
      status: 'Active',
      currentBalance: 500.00,
      notes: 'Call before dispatching from Valencia',
    },
    {
      id: 'CUST-005',
      storeName: 'Halapitan Trading Post',
      ownerName: 'Danilo Reyes',
      contact: '0922-678-9012',
      area: 'San Fernando',
      subArea: 'Halapitan (Poblacion)',
      purok: 'Purok 5',
      route: 'Valencia -> San Fernando Route',
      address: 'Halapitan Poblacion, San Fernando, Bukidnon',
      freezerSerial: 'SEL-FRZ-9104',
      barcodeNo: 'BC-9104-SFD',
      status: 'Active',
      currentBalance: 0.0,
      notes: 'Major highway junction store',
    },
    {
      id: 'CUST-006',
      storeName: 'Little Baguio Hillside Store',
      ownerName: 'Anita Mendoza',
      contact: '0935-777-4321',
      area: 'San Fernando',
      subArea: 'Little Baguio',
      purok: 'Purok 2',
      route: 'Valencia -> San Fernando Route',
      address: 'Little Baguio, San Fernando',
      freezerSerial: 'SEL-FRZ-9108',
      barcodeNo: 'BC-9108-SFD',
      status: 'Active',
      currentBalance: 0.0,
      notes: 'Highland cold area',
    },
    {
      id: 'CUST-007',
      storeName: 'Kahaponan Grocery Hub',
      ownerName: 'Elena Bautista',
      contact: '0920-456-7890',
      area: 'Valencia',
      subArea: 'Kahaponan',
      purok: 'Purok 3',
      route: 'Valencia City Route (Kahaponan)',
      address: 'Sayre Highway, Kahaponan, Valencia City',
      freezerSerial: 'SEL-FRZ-8825',
      barcodeNo: 'BC-8825-VAL',
      status: 'Active',
      currentBalance: 0.0,
      notes: 'High-volume highway store',
    },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log(`✓ Customers initialized (${customers.length} stores across Valencia, Cabanglasan, San Fernando)`);

  // 5. FREEZERS & TIMEMARK VERIFICATIONS
  const freezers = [
    {
      id: 'FRZ-001',
      serialNumber: 'SEL-FRZ-8821',
      barcode: 'BC-8821-VAL',
      model: 'Selecta Glass Top 300L',
      assignedStoreId: 'CUST-001',
      assignedStoreName: 'Aling Nena Sari-Sari Store',
      assignedOwner: 'Nena Dela Cruz',
      area: 'Valencia',
      status: 'Active',
      custodyDate: new Date('2026-01-15'),
      totalFee: 10000.00,
      productAllocation: 9000.00,
      processingFee: 1000.00,
      feePaymentStatus: 'Paid',
      feePaymentRef: 'OR-DEP-2026-101',
      condition: 'Excellent',
      lastVerifiedAt: new Date('2026-10-05T10:30:00Z'),
      nextDueAt: new Date('2026-11-04T10:30:00Z'),
      notes: 'Freezer temperature steady at -18°C',
    },
    {
      id: 'FRZ-002',
      serialNumber: 'SEL-FRZ-8822',
      barcode: 'BC-8822-VAL',
      model: 'Selecta Chest Freezer 400L',
      assignedStoreId: 'CUST-002',
      assignedStoreName: 'San Isidro Mini-Mart',
      assignedOwner: 'Maria Clara',
      area: 'Valencia',
      status: 'Active',
      custodyDate: new Date('2026-02-10'),
      totalFee: 10000.00,
      productAllocation: 9000.00,
      processingFee: 1000.00,
      feePaymentStatus: 'Paid',
      feePaymentRef: 'OR-DEP-2026-102',
      condition: 'Good',
      lastVerifiedAt: new Date('2026-09-28T09:15:00Z'),
      nextDueAt: new Date('2026-10-28T09:15:00Z'), // Due / Overdue
      notes: 'Due for monthly Timemark scan',
    },
    {
      id: 'FRZ-003',
      serialNumber: 'SEL-FRZ-9011',
      barcode: 'BC-9011-CAB',
      model: 'Selecta Glass Top 300L',
      assignedStoreId: 'CUST-003',
      assignedStoreName: 'Cabanglasan Highland Corner',
      assignedOwner: 'Ramon Santos',
      area: 'Cabanglasan',
      status: 'Active',
      custodyDate: new Date('2026-02-28'),
      totalFee: 10000.00,
      productAllocation: 9000.00,
      processingFee: 1000.00,
      feePaymentStatus: 'Paid',
      feePaymentRef: 'OR-DEP-2026-201',
      condition: 'Good',
      lastVerifiedAt: new Date('2026-10-12T14:20:00Z'),
      nextDueAt: new Date('2026-11-11T14:20:00Z'),
      notes: 'Scanned during Thursday delivery run',
    },
    {
      id: 'FRZ-004',
      serialNumber: 'SEL-FRZ-9015',
      barcode: 'BC-9015-CAB',
      model: 'Selecta Chest Freezer 350L',
      assignedStoreId: 'CUST-004',
      assignedStoreName: 'Paradise Valley Store',
      assignedOwner: 'Juanita Morales',
      area: 'Cabanglasan',
      status: 'Active',
      custodyDate: new Date('2026-03-02'),
      totalFee: 10000.00,
      productAllocation: 9000.00,
      processingFee: 1000.00,
      feePaymentStatus: 'Paid',
      feePaymentRef: 'OR-DEP-2026-202',
      condition: 'Good',
      lastVerifiedAt: new Date('2026-10-12T15:45:00Z'),
      nextDueAt: new Date('2026-11-11T15:45:00Z'),
      notes: 'Barcode clean and legible',
    },
    {
      id: 'FRZ-005',
      serialNumber: 'SEL-FRZ-9104',
      barcode: 'BC-9104-SFD',
      model: 'Selecta Chest Freezer 400L',
      assignedStoreId: 'CUST-005',
      assignedStoreName: 'Halapitan Trading Post',
      assignedOwner: 'Danilo Reyes',
      area: 'San Fernando',
      status: 'Active',
      custodyDate: new Date('2026-04-01'),
      totalFee: 10000.00,
      productAllocation: 9000.00,
      processingFee: 1000.00,
      feePaymentStatus: 'Paid',
      feePaymentRef: 'OR-DEP-2026-301',
      condition: 'Good',
      lastVerifiedAt: new Date('2026-10-18T11:00:00Z'),
      nextDueAt: new Date('2026-11-17T11:00:00Z'),
      notes: 'Highway corridor store freezer',
    },
    {
      id: 'FRZ-008',
      serialNumber: 'SEL-FRZ-8800',
      barcode: 'BC-8800-WH',
      model: 'Selecta Standby Chest 400L',
      assignedStoreId: null,
      assignedStoreName: 'Llano Bodega Central',
      assignedOwner: 'Llano Dealer',
      area: 'Valencia',
      status: 'Unassigned',
      custodyDate: new Date('2026-05-01'),
      totalFee: 0.00,
      productAllocation: 0.00,
      processingFee: 0.00,
      feePaymentStatus: 'Paid',
      condition: 'Good',
      lastVerifiedAt: new Date('2026-10-01T08:00:00Z'),
      nextDueAt: new Date('2026-10-31T08:00:00Z'),
      notes: 'Backup unit for rapid deployment',
    },
  ];

  for (const f of freezers) {
    await prisma.freezer.upsert({
      where: { id: f.id },
      update: f,
      create: f,
    });
  }
  console.log(`✓ Freezers initialized (${freezers.length} Selecta equipment units)`);

  // Sample verification records
  await prisma.freezerVerification.createMany({
    data: [
      {
        freezerId: 'FRZ-001',
        verificationMonth: '2026-10',
        scannedAt: new Date('2026-10-05T10:30:00Z'),
        barcodeScanned: 'BC-8821-VAL',
        staffName: 'Pedro Booker',
        photoPath: '/uploads/sample_freezer_barcode.png',
        status: 'Verified',
        verifiedBy: 'Dealer Admin',
        notes: 'Timemark photo verified. Clear serial and Selecta logo visible.',
      },
      {
        freezerId: 'FRZ-003',
        verificationMonth: '2026-10',
        scannedAt: new Date('2026-10-12T14:20:00Z'),
        barcodeScanned: 'BC-9011-CAB',
        staffName: 'Juan Dela Cruz',
        photoPath: '/uploads/sample_freezer_barcode.png',
        status: 'Verified',
        verifiedBy: 'Dealer Admin',
        notes: 'Highland route scan accepted.',
      },
    ],
  });
  console.log('✓ Freezer verification records created');

  // 6. BOOKINGS
  const booking1 = await prisma.booking.upsert({
    where: { id: 'BK-2026-1001' },
    update: {},
    create: {
      id: 'BK-2026-1001',
      bookingNumber: 'BK-2026-1001',
      customerId: 'CUST-001',
      storeName: 'Aling Nena Sari-Sari Store',
      route: 'Valencia City Route (Batangan)',
      area: 'Valencia',
      bookingDate: new Date('2026-10-24T09:30:00Z'),
      requestedDeliveryDate: new Date('2026-10-26T00:00:00Z'),
      bookerName: 'Pedro Booker',
      status: 'Delivered',
      subtotal: 26215.60,
      notes: 'Delivered and paid during Friday route',
      items: {
        create: [
          { productId: 'COR-001', productName: 'CHOCOLATE (CORNETTO)', category: 'CORNETTO', unitPrice: 28.00, quantity: 30, lineTotal: 840.00 },
          { productId: 'MAG-001', productName: 'CLASSIC (MAGNUM)', category: 'MAGNUM', unitPrice: 65.00, quantity: 15, lineTotal: 975.00 },
          { productId: 'SUP-001', productName: 'DOUBLE DUTCH 1.3L', category: 'SUPREME 1.3L', unitPrice: 260.00, quantity: 8, lineTotal: 2080.00 },
        ],
      },
    },
  });

  const booking2 = await prisma.booking.upsert({
    where: { id: 'BK-2026-1002' },
    update: {},
    create: {
      id: 'BK-2026-1002',
      bookingNumber: 'BK-2026-1002',
      customerId: 'CUST-003',
      storeName: 'Cabanglasan Highland Corner',
      route: 'Cabanglasan Delivery Route',
      area: 'Cabanglasan',
      bookingDate: new Date('2026-10-25T10:15:00Z'),
      requestedDeliveryDate: new Date('2026-10-27T00:00:00Z'),
      bookerName: 'Pedro Booker',
      status: 'Prepared',
      subtotal: 12120.00,
      notes: 'Cabanglasan Bongo trip packaged',
      items: {
        create: [
          { productId: 'COR-003', productName: 'COOKIES & DREAM (CORNETTO)', category: 'CORNETTO', unitPrice: 28.00, quantity: 40, lineTotal: 1120.00 },
          { productId: 'MAG-002', productName: 'ALMOND (MAGNUM)', category: 'MAGNUM', unitPrice: 65.00, quantity: 20, lineTotal: 1300.00 },
          { productId: 'SUP-002', productName: 'ROCKY ROAD 1.3L', category: 'SUPREME 1.3L', unitPrice: 260.00, quantity: 6, lineTotal: 1560.00 },
        ],
      },
    },
  });

  const booking3 = await prisma.booking.upsert({
    where: { id: 'BK-2026-1003' },
    update: {},
    create: {
      id: 'BK-2026-1003',
      bookingNumber: 'BK-2026-1003',
      customerId: 'CUST-002',
      storeName: 'San Isidro Mini-Mart',
      route: 'Valencia City Route (San Isidro)',
      area: 'Valencia',
      bookingDate: new Date('2026-10-26T08:45:00Z'),
      requestedDeliveryDate: new Date('2026-10-28T00:00:00Z'),
      bookerName: 'Pedro Booker',
      status: 'Booked',
      subtotal: 8920.00,
      notes: 'Weekly store booking awaiting bodega order',
      items: {
        create: [
          { productId: 'COR-002', productName: 'VANILLA (CORNETTO)', category: 'CORNETTO', unitPrice: 28.00, quantity: 25, lineTotal: 700.00 },
          { productId: 'SUP-001', productName: 'DOUBLE DUTCH 1.3L', category: 'SUPREME 1.3L', unitPrice: 260.00, quantity: 10, lineTotal: 2600.00 },
        ],
      },
    },
  });
  console.log('✓ Bookings created');

  // 7. BODEGA ORDER & STOCK RECEIVING
  const bodegaOrder = await prisma.bodegaOrder.upsert({
    where: { id: 'BOD-ORD-2026-101' },
    update: {},
    create: {
      id: 'BOD-ORD-2026-101',
      orderNumber: 'ORD-BOD-2026-101',
      selectaPosRef: 'POS-CDO-7719',
      orderDate: new Date('2026-10-21T09:00:00Z'),
      expectedArrivalDate: new Date('2026-10-23T10:00:00Z'),
      staffResponsible: 'Dealer Admin',
      status: 'Received',
      totalItemsNeeded: 370,
      totalAmount: 14800.00,
      notes: 'Unilever Selecta CDO Bodega delivery',
      items: {
        create: [
          { productId: 'COR-001', productName: 'CHOCOLATE (CORNETTO)', orderedQty: 250, receivedQty: 250, unitPrice: 24.50 },
          { productId: 'MAG-001', productName: 'CLASSIC (MAGNUM)', orderedQty: 120, receivedQty: 120, unitPrice: 56.00 },
        ],
      },
    },
  });

  await prisma.stockReceiving.upsert({
    where: { id: 'RCV-2026-001' },
    update: {},
    create: {
      id: 'RCV-2026-001',
      poNumber: 'POS-CDO-7719',
      bodegaOrderId: bodegaOrder.id,
      truckPlate: 'KAA-8921',
      driverInfo: 'Rogelio Fernandez (Unilever CDO Plant)',
      receiverName: 'Dealer Operations Staff',
      checkerName: 'Warehouse Supervisor',
      arrivalDate: new Date('2026-10-23T10:30:00Z'),
      status: 'Completed',
      totalReceivedValue: 14800.00,
      receiptPhotoPath: '/uploads/sample_supplier_receipt.png',
      remarks: 'Delivered in refrigerated van. Temperature at -21°C verified.',
      items: {
        create: [
          {
            productId: 'COR-001',
            productName: 'CHOCOLATE (CORNETTO)',
            category: 'CORNETTO',
            expectedQty: 250,
            receivedGoodQty: 245,
            damagedMeltedQty: 5,
            missingQty: 0,
            unitPrice: 24.50,
            notes: '5 tubs damaged during transit, moved to quarantine',
          },
          {
            productId: 'MAG-001',
            productName: 'CLASSIC (MAGNUM)',
            category: 'MAGNUM',
            expectedQty: 120,
            receivedGoodQty: 120,
            damagedMeltedQty: 0,
            missingQty: 0,
            unitPrice: 56.00,
            notes: 'All items intact and in good condition',
          },
        ],
      },
    },
  });
  console.log('✓ Bodega order & stock receiving record created');

  // 8. DELIVERY RUN & RECONCILIATION
  const deliveryRun = await prisma.deliveryRun.upsert({
    where: { id: 'RUN-2026-1024' },
    update: {},
    create: {
      id: 'RUN-2026-1024',
      runNumber: 'RUN-2026-1024',
      route: 'Valencia City Route (Batangan)',
      deliveryDate: new Date('2026-10-24T08:00:00Z'),
      vehicle: 'Bongo Refrigerated Van (Plate ABX-102)',
      driver: 'Juan Dela Cruz',
      loader1: 'Pedro Cruz',
      loader2: 'Mark Reyes',
      helper: 'Rico Santos',
      collector: 'Juan Dela Cruz',
      status: 'Reconciled',
      dispatchedAt: new Date('2026-10-24T08:30:00Z'),
      completedAt: new Date('2026-10-24T14:30:00Z'),
      reconciledAt: new Date('2026-10-24T16:00:00Z'),
      notes: 'Batangan Friday route closed with zero cash variance',
      stops: {
        create: [
          {
            bookingId: 'BK-2026-1001',
            customerId: 'CUST-001',
            storeName: 'Aling Nena Sari-Sari Store',
            stopOrder: 1,
            status: 'Delivered',
            recipientName: 'Nena Dela Cruz',
            deliveredAt: new Date('2026-10-24T11:30:00Z'),
            notes: 'Delivery completed and verified',
            items: {
              create: [
                {
                  productId: 'COR-001',
                  productName: 'CHOCOLATE (CORNETTO)',
                  orderedQty: 30,
                  loadedQty: 30,
                  acceptedQty: 28, // 2 BO refused
                  missingQty: 0,
                  boRefusedQty: 2,
                  intactReturnedQty: 0,
                  unitPrice: 28.00,
                  notes: '2 cones soft/melted, refused by store and returned',
                },
                {
                  productId: 'MAG-001',
                  productName: 'CLASSIC (MAGNUM)',
                  orderedQty: 15,
                  loadedQty: 15,
                  acceptedQty: 15,
                  missingQty: 0,
                  boRefusedQty: 0,
                  intactReturnedQty: 0,
                  unitPrice: 65.00,
                },
                {
                  productId: 'SUP-001',
                  productName: 'DOUBLE DUTCH 1.3L',
                  orderedQty: 8,
                  loadedQty: 8,
                  acceptedQty: 8,
                  missingQty: 0,
                  boRefusedQty: 0,
                  intactReturnedQty: 0,
                  unitPrice: 260.00,
                },
              ],
            },
            invoice: {
              create: {
                invoiceNumber: 'OR-VAL-8821',
                customerId: 'CUST-001',
                storeName: 'Aling Nena Sari-Sari Store',
                invoiceDate: new Date('2026-10-24T11:30:00Z'),
                // Billable = (28*28) + (15*65) + (8*260) = 784 + 975 + 2080 = 3839.00
                billableProductAmount: 3839.00,
                otherCharges: 0.0,
                approvedDiscounts: 0.0,
                priorBalance: 0.0,
                netAmountDue: 3839.00,
                totalPaid: 3839.00,
                balanceRemaining: 0.0,
                paymentStatus: 'Paid',
                collectorName: 'Juan Dela Cruz',
                customerSignature: 'Nena Dela Cruz',
                payments: {
                  create: [
                    {
                      customerId: 'CUST-001',
                      amount: 3839.00,
                      paymentMethod: 'Cash',
                      collectedBy: 'Juan Dela Cruz',
                      recordedAt: new Date('2026-10-24T11:35:00Z'),
                      notes: 'Paid in cash upon receipt',
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      reconciliation: {
        create: {
          reconciliationDate: new Date('2026-10-24T16:00:00Z'),
          totalLoadedUnits: 53,
          totalDeliveredAccepted: 51,
          totalIntactReturned: 0,
          totalBoReturned: 2,
          totalMissingUnaccounted: 0,
          expectedCash: 3839.00,
          actualCashCounted: 3839.00,
          cashVariance: 0.00,
          totalGcash: 0.00,
          totalBankTransfer: 0.00,
          totalChecks: 0.00,
          totalClearedFunds: 3839.00,
          outstandingCredit: 0.00,
          status: 'Approved',
          approvedBy: 'Dealer Admin',
          approvedAt: new Date('2026-10-24T16:15:00Z'),
          discrepancyReason: 'All counts reconciled accurately. 2 BO cones quarantined.',
        },
      },
    },
  });
  console.log('✓ Delivery run and reconciliation created');

  // 9. BO DISCREPANCY
  await prisma.boDiscrepancy.upsert({
    where: { id: 'BO-2026-001' },
    update: {},
    create: {
      id: 'BO-2026-001',
      deliveryRef: 'RUN-2026-1024',
      storeName: 'Aling Nena Sari-Sari Store',
      productId: 'COR-001',
      productName: 'CHOCOLATE (CORNETTO)',
      category: 'CORNETTO',
      quantity: 2,
      unitPrice: 28.00,
      totalDeduction: 56.00,
      reason: 'Soft cones due to transport vibration over bumpy road',
      reportedBy: 'Juan Dela Cruz',
      disposition: 'Pending Inspection',
      notes: 'Quarantined in warehouse chest freezer pending Unilever claim',
    },
  });
  console.log('✓ BO discrepancy recorded');

  // 10. SELECTA POS QUOTA
  await prisma.selectaPosQuota.upsert({
    where: { monthYear: '2026-10' },
    update: {},
    create: {
      monthYear: '2026-10',
      targetAmount: 1000000.00,
      recordedSales: 825000.00,
      notes: 'October 2026 Dealership Quota Target',
      entries: {
        create: [
          {
            entryDate: new Date('2026-10-10T17:00:00Z'),
            selectaPosRef: 'POS-ZREAD-1010',
            amount: 450000.00,
            enteredBy: 'Dealer Admin',
            remarks: 'Mid-month first batch official Unilever Selecta POS Z-reading',
          },
          {
            entryDate: new Date('2026-10-24T17:00:00Z'),
            selectaPosRef: 'POS-ZREAD-1024',
            amount: 375000.00,
            enteredBy: 'Dealer Admin',
            remarks: 'Second batch official Selecta POS Z-reading',
          },
        ],
      },
    },
  });
  console.log('✓ Monthly Selecta POS quota initialized (Target ₱1,000,000 | Confirmed: ₱825,000 / 82.5%)');

  // 11. AUDIT LOGS
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'System Initialized',
        module: 'Settings',
        user: 'Dealer Admin',
        details: JSON.stringify({ message: 'Llano Selecta Dealer POS and Inventory System initialized with local SQLite persistence' }),
      },
      {
        action: 'Route Reconciled',
        module: 'Delivery Reconciliation',
        user: 'Dealer Admin',
        details: JSON.stringify({ runNumber: 'RUN-2026-1024', cashVariance: 0.00, status: 'Approved' }),
      },
    ],
  });
  console.log('✓ Audit logs recorded');

  console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
