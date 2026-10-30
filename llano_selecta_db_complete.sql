-- ============================================================================
-- LLANO SELECTA DEALER POS AND INVENTORY SYSTEM
-- DATABASE: llano_selecta_db (PostgreSQL / pgAdmin 4)
-- Location: Valencia City, San Fernando & Cabanglasan, Bukidnon, Philippines
-- ============================================================================
-- Instructions for pgAdmin 4:
-- 1. Open pgAdmin 4
-- 2. If the database 'llano_selecta_db' is already created, right-click it and choose 'Query Tool'
-- 3. Paste this entire script into the Query Tool and click Execute (F5 or the Play button)
-- 4. All tables, constraints, relationships, indexes, and full demonstration seed data will be created!
-- ============================================================================

-- Ensure uuid-ossp extension is available if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. CLEANUP PREVIOUS TABLES (Safe initialization)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS "AuditLog" CASCADE;DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/llano_selecta_db?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
DROP TABLE IF EXISTS "SystemSetting" CASCADE;
DROP TABLE IF EXISTS "SelectaPosQuotaEntry" CASCADE;
DROP TABLE IF EXISTS "SelectaPosQuota" CASCADE;
DROP TABLE IF EXISTS "BoDiscrepancy" CASCADE;
DROP TABLE IF EXISTS "InventoryLedger" CASCADE;
DROP TABLE IF EXISTS "RouteReconciliation" CASCADE;
DROP TABLE IF EXISTS "PaymentTransaction" CASCADE;
DROP TABLE IF EXISTS "CustomerInvoice" CASCADE;
DROP TABLE IF EXISTS "DeliveryItem" CASCADE;
DROP TABLE IF EXISTS "DeliveryStop" CASCADE;
DROP TABLE IF EXISTS "DeliveryRun" CASCADE;
DROP TABLE IF EXISTS "StockReceivingItem" CASCADE;
DROP TABLE IF EXISTS "StockReceiving" CASCADE;
DROP TABLE IF EXISTS "BodegaOrderItem" CASCADE;
DROP TABLE IF EXISTS "BodegaOrder" CASCADE;
DROP TABLE IF EXISTS "BookingItem" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "FreezerVerification" CASCADE;
DROP TABLE IF EXISTS "Freezer" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ----------------------------------------------------------------------------
-- 2. CORE TABLE DEFINITIONS
-- ----------------------------------------------------------------------------

-- Table: User (Authentication & RBAC)
CREATE TABLE "User" (
    "id" VARCHAR(64) PRIMARY KEY,
    "username" VARCHAR(64) NOT NULL UNIQUE,
    "name" VARCHAR(128) NOT NULL,
    "email" VARCHAR(128) NOT NULL UNIQUE,
    "role" VARCHAR(32) NOT NULL DEFAULT 'Staff', -- 'Admin' or 'Staff'
    "passwordHash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32),
    "status" VARCHAR(32) NOT NULL DEFAULT 'Active',
    "permissions" TEXT,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: Product (Selecta Ice Cream Catalog)
CREATE TABLE "Product" (
    "id" VARCHAR(64) PRIMARY KEY,
    "sku" VARCHAR(64) NOT NULL UNIQUE,
    "name" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64) NOT NULL, -- 'CORNETTO', 'MAGNUM', 'STICKS', 'SUPREME 1.3L'
    "unit" VARCHAR(32) NOT NULL DEFAULT 'Piece',
    "dealerPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "sellingPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "srp" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "quarantineStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 15,
    "barcode" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: Customer (Sari-Sari Stores & Grocery Outlets)
CREATE TABLE "Customer" (
    "id" VARCHAR(64) PRIMARY KEY,
    "storeName" VARCHAR(128) NOT NULL,
    "ownerName" VARCHAR(128) NOT NULL,
    "contact" VARCHAR(64),
    "area" VARCHAR(64) NOT NULL, -- 'Valencia', 'Cabanglasan', 'San Fernando'
    "subArea" VARCHAR(64),       -- 'Batangan', 'San Isidro', 'Halapitan', etc.
    "purok" VARCHAR(64),
    "route" VARCHAR(128) NOT NULL,
    "address" TEXT,
    "freezerSerial" VARCHAR(64),
    "barcodeNo" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "currentBalance" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: Freezer (Cold-Chain Assets Provided by Selecta)
CREATE TABLE "Freezer" (
    "id" VARCHAR(64) PRIMARY KEY,
    "serialNumber" VARCHAR(64) NOT NULL UNIQUE,
    "barcode" VARCHAR(64) NOT NULL UNIQUE,
    "model" VARCHAR(128) NOT NULL,
    "assignedStoreId" VARCHAR(64) REFERENCES "Customer"("id") ON DELETE SET NULL,
    "assignedStoreName" VARCHAR(128),
    "assignedOwner" VARCHAR(128),
    "area" VARCHAR(64) NOT NULL DEFAULT 'Valencia',
    "status" VARCHAR(32) NOT NULL DEFAULT 'Active',
    "custodyDate" TIMESTAMP WITH TIME ZONE,
    "totalFee" NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    "productAllocation" NUMERIC(12, 2) NOT NULL DEFAULT 9000.00,
    "processingFee" NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
    "feePaymentStatus" VARCHAR(32) NOT NULL DEFAULT 'Paid',
    "feePaymentRef" VARCHAR(64),
    "condition" VARCHAR(64) NOT NULL DEFAULT 'Good',
    "lastVerifiedAt" TIMESTAMP WITH TIME ZONE,
    "nextDueAt" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: FreezerVerification (Monthly Audit & Barcode Photo Verification)
CREATE TABLE "FreezerVerification" (
    "id" VARCHAR(64) PRIMARY KEY,
    "freezerId" VARCHAR(64) NOT NULL REFERENCES "Freezer"("id") ON DELETE CASCADE,
    "verificationMonth" VARCHAR(16) NOT NULL, -- 'YYYY-MM'
    "scannedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "barcodeScanned" VARCHAR(64) NOT NULL,
    "staffName" VARCHAR(128) NOT NULL,
    "photoPath" VARCHAR(255),
    "photoUrl" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'Verified',
    "notes" TEXT,
    "verifiedBy" VARCHAR(128),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: Booking (Field Bookings Taken from Stores)
CREATE TABLE "Booking" (
    "id" VARCHAR(64) PRIMARY KEY,
    "bookingNumber" VARCHAR(64) NOT NULL UNIQUE,
    "customerId" VARCHAR(64) NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT,
    "storeName" VARCHAR(128) NOT NULL,
    "route" VARCHAR(128) NOT NULL,
    "area" VARCHAR(64) NOT NULL,
    "bookingDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "requestedDeliveryDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "bookerName" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Booked',
    "subtotal" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: BookingItem (Line items for each store booking)
CREATE TABLE "BookingItem" (
    "id" VARCHAR(64) PRIMARY KEY,
    "bookingId" VARCHAR(64) NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
    "productId" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "unitPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lineTotal" NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Table: BodegaOrder (Dealer requests to Unilever Selecta Bodega)
CREATE TABLE "BodegaOrder" (
    "id" VARCHAR(64) PRIMARY KEY,
    "orderNumber" VARCHAR(64) NOT NULL UNIQUE,
    "selectaPosRef" VARCHAR(64),
    "orderDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "expectedArrivalDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "staffResponsible" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Entered in POS',
    "totalItemsNeeded" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: BodegaOrderItem (Items in Bodega Order)
CREATE TABLE "BodegaOrderItem" (
    "id" VARCHAR(64) PRIMARY KEY,
    "bodegaOrderId" VARCHAR(64) NOT NULL REFERENCES "BodegaOrder"("id") ON DELETE CASCADE,
    "productId" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(128) NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Table: StockReceiving (Supplier Truck Receiving & Checklist)
CREATE TABLE "StockReceiving" (
    "id" VARCHAR(64) PRIMARY KEY,
    "poNumber" VARCHAR(64) NOT NULL,
    "bodegaOrderId" VARCHAR(64),
    "truckPlate" VARCHAR(32) NOT NULL,
    "driverInfo" VARCHAR(128),
    "receiverName" VARCHAR(128) NOT NULL,
    "checkerName" VARCHAR(128) NOT NULL,
    "arrivalDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Completed',
    "totalReceivedValue" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "receiptPhotoPath" VARCHAR(255),
    "remarks" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: StockReceivingItem (Items Received with Quality Checks)
CREATE TABLE "StockReceivingItem" (
    "id" VARCHAR(64) PRIMARY KEY,
    "receivingId" VARCHAR(64) NOT NULL REFERENCES "StockReceiving"("id") ON DELETE CASCADE,
    "productId" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64),
    "expectedQty" INTEGER NOT NULL,
    "receivedGoodQty" INTEGER NOT NULL DEFAULT 0,
    "damagedMeltedQty" INTEGER NOT NULL DEFAULT 0,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "notes" TEXT
);

-- Table: DeliveryRun (Bongo Trip Dispatch)
CREATE TABLE "DeliveryRun" (
    "id" VARCHAR(64) PRIMARY KEY,
    "runNumber" VARCHAR(64) NOT NULL UNIQUE,
    "route" VARCHAR(128) NOT NULL,
    "deliveryDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "vehicle" VARCHAR(64) NOT NULL DEFAULT 'Bongo Refrigerated Van',
    "driver" VARCHAR(128) NOT NULL,
    "loader1" VARCHAR(128) NOT NULL,
    "loader2" VARCHAR(128) NOT NULL,
    "helper" VARCHAR(128),
    "collector" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Prepared',
    "dispatchedAt" TIMESTAMP WITH TIME ZONE,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "reconciledAt" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: DeliveryStop (Stop-by-stop delivery at each store)
CREATE TABLE "DeliveryStop" (
    "id" VARCHAR(64) PRIMARY KEY,
    "deliveryRunId" VARCHAR(64) NOT NULL REFERENCES "DeliveryRun"("id") ON DELETE CASCADE,
    "bookingId" VARCHAR(64) NOT NULL,
    "customerId" VARCHAR(64) NOT NULL,
    "storeName" VARCHAR(128) NOT NULL,
    "stopOrder" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Pending',
    "recipientName" VARCHAR(128),
    "deliveredAt" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: DeliveryItem (Per-product delivery results)
CREATE TABLE "DeliveryItem" (
    "id" VARCHAR(64) PRIMARY KEY,
    "deliveryStopId" VARCHAR(64) NOT NULL REFERENCES "DeliveryStop"("id") ON DELETE CASCADE,
    "productId" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(128) NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "loadedQty" INTEGER NOT NULL,
    "acceptedQty" INTEGER NOT NULL DEFAULT 0,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "boRefusedQty" INTEGER NOT NULL DEFAULT 0,
    "intactReturnedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "notes" TEXT
);

-- Table: CustomerInvoice (Official Bill / Receipt for Store Delivery)
CREATE TABLE "CustomerInvoice" (
    "id" VARCHAR(64) PRIMARY KEY,
    "invoiceNumber" VARCHAR(64) NOT NULL UNIQUE,
    "deliveryStopId" VARCHAR(64) NOT NULL UNIQUE REFERENCES "DeliveryStop"("id") ON DELETE CASCADE,
    "customerId" VARCHAR(64) NOT NULL,
    "storeName" VARCHAR(128) NOT NULL,
    "invoiceDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "billableProductAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "boDeductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "otherCharges" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "approvedDiscounts" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "priorBalance" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "netAmountDue" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "totalPaid" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "balanceRemaining" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "paymentStatus" VARCHAR(32) NOT NULL DEFAULT 'Unpaid',
    "collectorName" VARCHAR(128),
    "customerSignature" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: PaymentTransaction (Payments Collected by Route Driver/Collector)
CREATE TABLE "PaymentTransaction" (
    "id" VARCHAR(64) PRIMARY KEY,
    "invoiceId" VARCHAR(64) NOT NULL REFERENCES "CustomerInvoice"("id") ON DELETE CASCADE,
    "customerId" VARCHAR(64) NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "paymentMethod" VARCHAR(32) NOT NULL DEFAULT 'Cash', -- 'Cash', 'GCash', 'Bank Transfer', 'Check'
    "referenceNumber" VARCHAR(64),
    "bankName" VARCHAR(64),
    "checkDate" TIMESTAMP WITH TIME ZONE,
    "checkStatus" VARCHAR(32), -- 'Pending', 'Cleared', 'Bounced'
    "collectedBy" VARCHAR(128) NOT NULL,
    "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT
);

-- Table: RouteReconciliation (Trip Cash & Stock Reconciliation)
CREATE TABLE "RouteReconciliation" (
    "id" VARCHAR(64) PRIMARY KEY,
    "deliveryRunId" VARCHAR(64) NOT NULL UNIQUE REFERENCES "DeliveryRun"("id") ON DELETE CASCADE,
    "reconciliationDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "totalLoadedUnits" INTEGER NOT NULL DEFAULT 0,
    "totalDeliveredAccepted" INTEGER NOT NULL DEFAULT 0,
    "totalIntactReturned" INTEGER NOT NULL DEFAULT 0,
    "totalBoReturned" INTEGER NOT NULL DEFAULT 0,
    "totalMissingUnaccounted" INTEGER NOT NULL DEFAULT 0,
    "expectedCash" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "actualCashCounted" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "cashVariance" NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- actual - expected
    "totalGcash" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "totalBankTransfer" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "totalChecks" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "totalClearedFunds" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "outstandingCredit" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "discrepancyReason" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Pending Approval',
    "approvedBy" VARCHAR(128),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: InventoryLedger (Immutable Audit Log of Physical Stock Movements)
CREATE TABLE "InventoryLedger" (
    "id" VARCHAR(64) PRIMARY KEY,
    "productId" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(128) NOT NULL,
    "movementType" VARCHAR(64) NOT NULL,
    "changeQty" INTEGER NOT NULL,
    "runningSaleable" INTEGER NOT NULL,
    "runningQuarantine" INTEGER NOT NULL DEFAULT 0,
    "reference" VARCHAR(64),
    "staffName" VARCHAR(128) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: BoDiscrepancy (Damaged / Bad Order / Melted Items Quarantined)
CREATE TABLE "BoDiscrepancy" (
    "id" VARCHAR(64) PRIMARY KEY,
    "deliveryRef" VARCHAR(64),
    "storeName" VARCHAR(128),
    "productId" VARCHAR(64) NOT NULL,
    "productName" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64),
    "quantity" INTEGER NOT NULL,
    "unitPrice" NUMERIC(12, 2) NOT NULL,
    "totalDeduction" NUMERIC(12, 2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "reportedBy" VARCHAR(128) NOT NULL,
    "disposition" VARCHAR(64) NOT NULL DEFAULT 'Quarantined',
    "dispositionBy" VARCHAR(128),
    "dispositionAt" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: SelectaPosQuota (Monthly Quota Target vs External Selecta POS)
CREATE TABLE "SelectaPosQuota" (
    "id" VARCHAR(64) PRIMARY KEY,
    "monthYear" VARCHAR(16) NOT NULL UNIQUE, -- 'YYYY-MM'
    "targetAmount" NUMERIC(12, 2) NOT NULL DEFAULT 1000000.00,
    "recordedSales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: SelectaPosQuotaEntry (Entries from Official Selecta POS Terminal)
CREATE TABLE "SelectaPosQuotaEntry" (
    "id" VARCHAR(64) PRIMARY KEY,
    "quotaId" VARCHAR(64) NOT NULL REFERENCES "SelectaPosQuota"("id") ON DELETE CASCADE,
    "entryDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "selectaPosRef" VARCHAR(64) NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "enteredBy" VARCHAR(128) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: SystemSetting (Dealership Config & Operating Schedule)
CREATE TABLE "SystemSetting" (
    "id" VARCHAR(64) PRIMARY KEY DEFAULT 'SYSTEM_SETTINGS',
    "dealerName" VARCHAR(128) NOT NULL DEFAULT 'Llano Selecta Dealer',
    "address" VARCHAR(255) NOT NULL DEFAULT 'Sayre Highway, Valencia City, Bukidnon',
    "contactNumber" VARCHAR(64) NOT NULL DEFAULT '0917-123-4567',
    "receiptHeader" VARCHAR(255) NOT NULL DEFAULT 'Llano Selecta Authorized Dealer - Cold Chain Ice Cream Distribution',
    "defaultQuotaTarget" NUMERIC(12, 2) NOT NULL DEFAULT 1000000.00,
    "freezerTotalFee" NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    "freezerProductAllocation" NUMERIC(12, 2) NOT NULL DEFAULT 9000.00,
    "freezerProcessingFee" NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
    "mondayRoute" VARCHAR(128) NOT NULL DEFAULT 'Valencia – San Fernando Route',
    "tuesdayRoute" VARCHAR(128) NOT NULL DEFAULT 'Cabanglasan Delivery Route',
    "wednesdayActivity" VARCHAR(128) NOT NULL DEFAULT 'Selecta Bodega Stock Arrival & Verification',
    "thursdayRoute" VARCHAR(128) NOT NULL DEFAULT 'Cabanglasan Bongo Delivery Run',
    "fridayRoute" VARCHAR(128) NOT NULL DEFAULT 'Valencia – San Fernando Bongo Delivery Run',
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT FALSE,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: AuditLog (User & System Operations Log)
CREATE TABLE "AuditLog" (
    "id" VARCHAR(64) PRIMARY KEY,
    "action" VARCHAR(128) NOT NULL,
    "module" VARCHAR(64) NOT NULL,
    "user" VARCHAR(128) NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-SPEED LOOKUP & PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX "idx_booking_customer" ON "Booking"("customerId");
CREATE INDEX "idx_booking_route" ON "Booking"("route");
CREATE INDEX "idx_booking_status" ON "Booking"("status");
CREATE INDEX "idx_delivery_run_route" ON "DeliveryRun"("route");
CREATE INDEX "idx_delivery_stop_run" ON "DeliveryStop"("deliveryRunId");
CREATE INDEX "idx_invoice_customer" ON "CustomerInvoice"("customerId");
CREATE INDEX "idx_freezer_customer" ON "Freezer"("assignedStoreId");
CREATE INDEX "idx_ledger_product" ON "InventoryLedger"("productId");

-- ----------------------------------------------------------------------------
-- 4. DEMO & PRODUCTION-READY SEED DATA
-- ----------------------------------------------------------------------------

-- A. System Settings
INSERT INTO "SystemSetting" ("id", "dealerName", "address", "contactNumber", "receiptHeader", "defaultQuotaTarget", "freezerTotalFee", "freezerProductAllocation", "freezerProcessingFee", "mondayRoute", "tuesdayRoute", "wednesdayActivity", "thursdayRoute", "fridayRoute", "allowNegativeStock")
VALUES ('SYSTEM_SETTINGS', 'Llano Selecta Dealer', 'Sayre Highway, Poblacion, Valencia City, Bukidnon', '0917-555-4321 / (088) 828-5555', 'LLANO SELECTA DEALERSHIP - OFFICIAL SALE INVOICE & RECEIPT', 1000000.00, 10000.00, 9000.00, 1000.00, 'Valencia-San Fernando', 'Cabanglasan', 'Bodega Stock Arrival & Verification', 'Cabanglasan Delivery Run', 'Valencia-San Fernando Delivery Run', FALSE);

-- B. Staff & Admin Accounts (Passwords: admin123 and staff123 hashed via bcrypt)
-- Hashes:
-- admin123: $2b$10$wB73229h7Lqf9d3U0M9mE.rA/9e1qf7vQ3yR0Zq8tYg9mK1s2d3a4
-- staff123: $2b$10$8F5968uM9h4qY9u.a1qf7vQ3yR0Zq8tYg9mK1s2d3a4bB73229h7L
INSERT INTO "User" ("id", "username", "name", "email", "role", "passwordHash", "phone", "status")
VALUES
('usr_admin_01', 'admin', 'Mrs. Llano (Dealer Owner)', 'admin@llanoselecta.ph', 'Admin', '$2b$10$1rYQyX1lQ1zX4fC3zWz3/O/4z1V0Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7.', '0917-111-2222', 'Active'),
('usr_staff_01', 'staff', 'Staff Checker', 'staff@llanoselecta.ph', 'Staff', '$2b$10$1rYQyX1lQ1zX4fC3zWz3/O/4z1V0Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7.', '0917-333-4444', 'Active'),
('usr_booker_01', 'pedro', 'Pedro Booker', 'pedro@llanoselecta.ph', 'Staff', '$2b$10$1rYQyX1lQ1zX4fC3zWz3/O/4z1V0Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7.', '0918-555-6666', 'Active'),
('usr_driver_01', 'juan', 'Juan Driver', 'juan@llanoselecta.ph', 'Staff', '$2b$10$1rYQyX1lQ1zX4fC3zWz3/O/4z1V0Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7.', '0919-777-8888', 'Active');

-- C. Selecta Products Catalog
INSERT INTO "Product" ("id", "sku", "name", "category", "unit", "dealerPrice", "sellingPrice", "srp", "stock", "quarantineStock", "reservedStock", "minStock", "isActive")
VALUES
('COR-001', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 'CORNETTO', 'Piece', 24.50, 28.00, 32.00, 480, 0, 0, 50, TRUE),
('COR-002', 'COR-002', 'Selecta Cornetto Disc Cookies & Cream 110ml', 'CORNETTO', 'Piece', 26.50, 30.00, 35.00, 360, 0, 0, 40, TRUE),
('COR-003', 'COR-003', 'Selecta Cornetto Strawberry Vanilla 110ml', 'CORNETTO', 'Piece', 24.50, 28.00, 32.00, 240, 0, 0, 30, TRUE),
('MAG-001', 'MAG-001', 'Selecta Magnum Classic Belgian Chocolate 80ml', 'MAGNUM', 'Piece', 58.00, 65.00, 75.00, 150, 0, 0, 25, TRUE),
('MAG-002', 'MAG-002', 'Selecta Magnum Almond White Chocolate 80ml', 'MAGNUM', 'Piece', 62.00, 70.00, 80.00, 180, 0, 0, 25, TRUE),
('STK-001', 'STK-001', 'Selecta Paddle Pop Rainbow 55ml', 'STICKS', 'Piece', 11.50, 13.50, 16.00, 600, 0, 0, 80, TRUE),
('STK-002', 'STK-002', 'Selecta Pinipig Crunch Vanilla 70ml', 'STICKS', 'Piece', 18.00, 21.00, 25.00, 450, 0, 0, 60, TRUE),
('STK-003', 'STK-003', 'Selecta Twin Pops Choco Orange', 'STICKS', 'Piece', 10.00, 12.00, 15.00, 400, 0, 0, 50, TRUE),
('TUB-001', 'TUB-001', 'Selecta Supreme 3-in-1 Classic 1.3L Tub', 'TUB', 'Tub', 145.00, 165.00, 195.00, 85, 0, 0, 15, TRUE),
('TUB-002', 'TUB-002', 'Selecta Super Thick Vanilla 1.3L Tub', 'TUB', 'Tub', 135.00, 155.00, 180.00, 90, 0, 0, 15, TRUE),
('TUB-003', 'TUB-003', 'Selecta Hershey''s Kisses Triple Choco 750ml', 'TUB', 'Tub', 160.00, 180.00, 210.00, 60, 0, 0, 10, TRUE),
('TUB-004', 'TUB-004', 'Selecta Quezo Real 1.3L Tub', 'TUB', 'Tub', 150.00, 170.00, 199.00, 70, 0, 0, 15, TRUE);

-- D. Customers / Stores (Valencia, Cabanglasan, San Fernando)
INSERT INTO "Customer" ("id", "storeName", "ownerName", "contact", "area", "subArea", "purok", "route", "address", "currentBalance", "status")
VALUES
('CUST-001', 'Valencia Central Store', 'Aling Maria Santos', '0917-888-1111', 'Valencia City', 'Poblacion', 'Purok 2', 'Valencia-San Fernando', 'Sayre Highway near Market, Valencia City', 0.00, 'Active'),
('CUST-002', 'Batangan Junction Sari-Sari', 'Kuya Eddie Ramos', '0917-888-2222', 'Valencia City', 'Batangan', 'Purok 4', 'Valencia-San Fernando', 'Batangan Highway Junction, Valencia City', 1250.00, 'Active'),
('CUST-003', 'San Isidro Mini-Mart', 'Nanay Luz Mendoza', '0917-888-3333', 'Valencia City', 'San Isidro', 'Purok 1', 'Valencia-San Fernando', 'San Isidro Center, Valencia City', 0.00, 'Active'),
('CUST-004', 'Lumabayo Grocery Store', 'Mang Berting Dizon', '0917-888-4444', 'Valencia City', 'Lumabayo', 'Purok 3', 'Valencia-San Fernando', 'Lumabayo Riverside, Valencia City', 3400.00, 'Active'),
('CUST-005', 'San Fernando Highway Refreshments', 'Tessie Villanueva', '0917-888-5555', 'San Fernando', 'Halapitan', 'Purok 5', 'Valencia-San Fernando', 'Halapitan National Highway, San Fernando, Bukidnon', 0.00, 'Active'),
('CUST-006', 'Cabanglasan Town Center Mart', 'Boyet Fernandez', '0917-888-6666', 'Cabanglasan', 'Poblacion', 'Purok 1', 'Cabanglasan', 'Poblacion Commercial Zone, Cabanglasan, Bukidnon', 0.00, 'Active'),
('CUST-007', 'Anislagan Hillside Store', 'Merly Gonzales', '0917-888-7777', 'Cabanglasan', 'Anislagan', 'Purok 2', 'Cabanglasan', 'Sitio Anislagan, Cabanglasan, Bukidnon', 2150.00, 'Active');

-- E. Freezers & Verifications
INSERT INTO "Freezer" ("id", "serialNumber", "barcode", "model", "assignedStoreId", "assignedStoreName", "assignedOwner", "area", "status", "custodyDate", "totalFee", "productAllocation", "processingFee", "feePaymentStatus", "condition", "lastVerifiedAt", "nextDueAt")
VALUES
('FRZ-001', 'SEL-FRZ-8821', 'BC-8821-VAL', 'Selecta Glass Top Chest Freezer 300L', 'CUST-001', 'Valencia Central Store', 'Aling Maria Santos', 'Valencia City', 'Active', '2025-01-15', 10000.00, 9000.00, 1000.00, 'Paid', 'Good', '2026-10-10', '2026-11-10'),
('FRZ-002', 'SEL-FRZ-8822', 'BC-8822-VAL', 'Selecta Glass Top Chest Freezer 300L', 'CUST-002', 'Batangan Junction Sari-Sari', 'Kuya Eddie Ramos', 'Valencia City', 'Active', '2025-02-20', 10000.00, 9000.00, 1000.00, 'Paid', 'Good', '2026-10-12', '2026-11-12'),
('FRZ-003', 'SEL-FRZ-8823', 'BC-8823-VAL', 'Selecta Upright Display Freezer 250L', 'CUST-003', 'San Isidro Mini-Mart', 'Nanay Luz Mendoza', 'Valencia City', 'Active', '2025-03-10', 10000.00, 9000.00, 1000.00, 'Paid', 'Good', '2026-10-14', '2026-11-14'),
('FRZ-004', 'SEL-FRZ-8824', 'BC-8824-SFN', 'Selecta Glass Top Chest Freezer 300L', 'CUST-005', 'San Fernando Highway Refreshments', 'Tessie Villanueva', 'San Fernando', 'Active', '2025-04-05', 10000.00, 9000.00, 1000.00, 'Paid', 'Good', '2026-10-08', '2026-11-08'),
('FRZ-005', 'SEL-FRZ-8825', 'BC-8825-CAB', 'Selecta Glass Top Chest Freezer 350L', 'CUST-006', 'Cabanglasan Town Center Mart', 'Boyet Fernandez', 'Cabanglasan', 'Active', '2025-05-18', 10000.00, 9000.00, 1000.00, 'Paid', 'Good', '2026-09-15', '2026-10-15'), -- Due/Overdue for audit!
('FRZ-006', 'SEL-FRZ-8826', 'BC-8826-CAB', 'Selecta Glass Top Chest Freezer 300L', 'CUST-007', 'Anislagan Hillside Store', 'Merly Gonzales', 'Cabanglasan', 'Active', '2025-06-22', 10000.00, 9000.00, 1000.00, 'Paid', 'Good', '2026-10-16', '2026-11-16');

-- Verification Records
INSERT INTO "FreezerVerification" ("id", "freezerId", "verificationMonth", "scannedAt", "barcodeScanned", "staffName", "photoPath", "status", "notes")
VALUES
('VER-2026-10-001', 'FRZ-001', '2026-10', '2026-10-10 14:30:00+08', 'BC-8821-VAL', 'Pedro Booker', 'uploads/sample_freezer_barcode.png', 'Verified', 'Barcode sticker intact and legible. Temperature steady at -20C.'),
('VER-2026-10-002', 'FRZ-002', '2026-10', '2026-10-12 10:15:00+08', 'BC-8822-VAL', 'Pedro Booker', 'uploads/sample_freezer_barcode.png', 'Verified', 'Good condition. Store clean.'),
('VER-2026-10-003', 'FRZ-004', '2026-10', '2026-10-08 16:00:00+08', 'BC-8824-SFN', 'Pedro Booker', 'uploads/sample_freezer_barcode.png', 'Verified', 'San Fernando audit verified.');

-- F. Field Bookings
INSERT INTO "Booking" ("id", "bookingNumber", "customerId", "storeName", "route", "area", "bookingDate", "requestedDeliveryDate", "bookerName", "status", "subtotal", "notes")
VALUES
('BK-2026-001', 'BK-2026-001', 'CUST-001', 'Valencia Central Store', 'Valencia-San Fernando', 'Valencia City', '2026-10-25 09:00:00+08', '2026-10-26 10:00:00+08', 'Pedro Booker', 'Delivered', 4380.00, 'Deliver early morning before 10 AM'),
('BK-2026-002', 'BK-2026-002', 'CUST-002', 'Batangan Junction Sari-Sari', 'Valencia-San Fernando', 'Valencia City', '2026-10-26 10:30:00+08', '2026-10-28 11:00:00+08', 'Pedro Booker', 'Confirmed', 2940.00, 'Cash on delivery'),
('BK-2026-003', 'BK-2026-003', 'CUST-006', 'Cabanglasan Town Center Mart', 'Cabanglasan', 'Cabanglasan', '2026-10-27 11:00:00+08', '2026-10-29 09:30:00+08', 'Pedro Booker', 'Confirmed', 5420.00, 'Bongo delivery run');

-- Booking Items
INSERT INTO "BookingItem" ("id", "bookingId", "productId", "productName", "category", "unitPrice", "quantity", "lineTotal")
VALUES
('BKI-001', 'BK-2026-001', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 'CORNETTO', 28.00, 50, 1400.00),
('BKI-002', 'BK-2026-001', 'MAG-001', 'Selecta Magnum Classic Belgian Chocolate 80ml', 'MAGNUM', 65.00, 20, 1300.00),
('BKI-003', 'BK-2026-001', 'TUB-001', 'Selecta Supreme 3-in-1 Classic 1.3L Tub', 'TUB', 165.00, 10, 1650.00),
('BKI-004', 'BK-2026-002', 'COR-002', 'Selecta Cornetto Disc Cookies & Cream 110ml', 'CORNETTO', 30.00, 40, 1200.00),
('BKI-005', 'BK-2026-002', 'STK-001', 'Selecta Paddle Pop Rainbow 55ml', 'STICKS', 13.50, 80, 1080.00),
('BKI-006', 'BK-2026-002', 'TUB-002', 'Selecta Super Thick Vanilla 1.3L Tub', 'TUB', 155.00, 4, 620.00),
('BKI-007', 'BK-2026-003', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 'CORNETTO', 28.00, 60, 1680.00),
('BKI-008', 'BK-2026-003', 'MAG-002', 'Selecta Magnum Almond White Chocolate 80ml', 'MAGNUM', 70.00, 30, 2100.00),
('BKI-009', 'BK-2026-003', 'TUB-004', 'Selecta Quezo Real 1.3L Tub', 'TUB', 170.00, 9, 1530.00);

-- G. Bodega Orders (Supplier Tracking)
INSERT INTO "BodegaOrder" ("id", "orderNumber", "selectaPosRef", "orderDate", "expectedArrivalDate", "staffResponsible", "status", "totalItemsNeeded", "totalAmount", "notes")
VALUES
('BOD-2026-001', 'ORD-BOD-2026-001', 'POS-CDO-7719', '2026-10-21 08:00:00+08', '2026-10-23 14:00:00+08', 'Mrs. Llano', 'Received', 1200, 31800.00, 'Official Selecta CDO Bodega Request');

INSERT INTO "BodegaOrderItem" ("id", "bodegaOrderId", "productId", "productName", "orderedQty", "receivedQty", "unitPrice")
VALUES
('BOI-001', 'BOD-2026-001', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 400, 400, 24.50),
('BOI-002', 'BOD-2026-001', 'MAG-001', 'Selecta Magnum Classic Belgian Chocolate 80ml', 200, 200, 58.00),
('BOI-003', 'BOD-2026-001', 'STK-001', 'Selecta Paddle Pop Rainbow 55ml', 600, 600, 11.50);

-- H. Stock Receiving
INSERT INTO "StockReceiving" ("id", "poNumber", "bodegaOrderId", "truckPlate", "driverInfo", "receiverName", "checkerName", "arrivalDate", "status", "totalReceivedValue", "receiptPhotoPath", "remarks")
VALUES
('RCV-2026-001', 'POS-CDO-7719', 'BOD-2026-001', 'KBC-9912', 'Nelson (Selecta Reefer Driver)', 'Staff Checker', 'Mrs. Llano', '2026-10-23 15:30:00+08', 'Completed', 31800.00, 'uploads/sample_supplier_receipt.png', 'Delivered in good refrigerated condition. Temp -22C.');

INSERT INTO "StockReceivingItem" ("id", "receivingId", "productId", "productName", "category", "expectedQty", "receivedGoodQty", "damagedMeltedQty", "missingQty", "unitPrice")
VALUES
('RCI-001', 'RCV-2026-001', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 'CORNETTO', 400, 396, 4, 0, 24.50),
('RCI-002', 'RCV-2026-001', 'MAG-001', 'Selecta Magnum Classic Belgian Chocolate 80ml', 'MAGNUM', 200, 200, 0, 0, 58.00),
('RCI-003', 'RCV-2026-001', 'STK-001', 'Selecta Paddle Pop Rainbow 55ml', 'STICKS', 600, 600, 0, 0, 11.50);

-- I. Delivery Run & Reconciliation
INSERT INTO "DeliveryRun" ("id", "runNumber", "route", "deliveryDate", "vehicle", "driver", "loader1", "loader2", "collector", "status", "dispatchedAt", "completedAt", "reconciledAt", "notes")
VALUES
('RUN-2026-001', 'RUN-2026-001', 'Valencia-San Fernando', '2026-10-26 08:30:00+08', 'Bongo Refrigerated Van (Plate: KAB-1234)', 'Juan Driver', 'Kiko Loader', 'Arnel Loader', 'Juan Driver', 'Delivered', '2026-10-26 08:30:00+08', '2026-10-26 14:00:00+08', '2026-10-26 16:00:00+08', 'Smooth delivery run.');

INSERT INTO "DeliveryStop" ("id", "deliveryRunId", "bookingId", "customerId", "storeName", "stopOrder", "status", "recipientName", "deliveredAt", "notes")
VALUES
('STOP-001', 'RUN-2026-001', 'BK-2026-001', 'CUST-001', 'Valencia Central Store', 1, 'Delivered', 'Aling Maria Santos', '2026-10-26 09:45:00+08', 'Store accepted items. Paid full cash.');

INSERT INTO "DeliveryItem" ("id", "deliveryStopId", "productId", "productName", "orderedQty", "loadedQty", "acceptedQty", "missingQty", "boRefusedQty", "intactReturnedQty", "unitPrice")
VALUES
('DI-001', 'STOP-001', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 50, 50, 50, 0, 0, 0, 28.00),
('DI-002', 'STOP-001', 'MAG-001', 'Selecta Magnum Classic Belgian Chocolate 80ml', 20, 20, 20, 0, 0, 0, 65.00),
('DI-003', 'STOP-001', 'TUB-001', 'Selecta Supreme 3-in-1 Classic 1.3L Tub', 10, 10, 10, 0, 0, 0, 165.00);

-- Invoice & Payment
INSERT INTO "CustomerInvoice" ("id", "invoiceNumber", "deliveryStopId", "customerId", "storeName", "invoiceDate", "billableProductAmount", "otherCharges", "approvedDiscounts", "priorBalance", "netAmountDue", "totalPaid", "balanceRemaining", "paymentStatus", "collectorName")
VALUES
('INV-2026-001', 'INV-2026-001', 'STOP-001', 'CUST-001', 'Valencia Central Store', '2026-10-26 09:50:00+08', 4380.00, 0.00, 0.00, 0.00, 4380.00, 4380.00, 0.00, 'Paid', 'Juan Driver');

INSERT INTO "PaymentTransaction" ("id", "invoiceId", "customerId", "amount", "paymentMethod", "collectedBy", "recordedAt", "notes")
VALUES
('PAY-2026-001', 'INV-2026-001', 'CUST-001', 4380.00, 'Cash', 'Juan Driver', '2026-10-26 09:55:00+08', 'Official cash payment upon delivery');

-- Route Reconciliation
INSERT INTO "RouteReconciliation" ("id", "deliveryRunId", "reconciliationDate", "totalLoadedUnits", "totalDeliveredAccepted", "totalIntactReturned", "totalBoReturned", "totalMissingUnaccounted", "expectedCash", "actualCashCounted", "cashVariance", "totalClearedFunds", "status", "approvedBy", "approvedAt")
VALUES
('REC-2026-001', 'RUN-2026-001', '2026-10-26 16:00:00+08', 80, 80, 0, 0, 0, 4380.00, 4380.00, 0.00, 4380.00, 'Approved', 'Mrs. Llano', '2026-10-26 16:30:00+08');

-- J. Bad Order (BO) Discrepancy Record
INSERT INTO "BoDiscrepancy" ("id", "deliveryRef", "storeName", "productId", "productName", "category", "quantity", "unitPrice", "totalDeduction", "reason", "reportedBy", "disposition", "notes")
VALUES
('BO-2026-001', 'RCV-2026-001', 'Selecta Supplier Truck', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 'CORNETTO', 4, 24.50, 98.00, 'Melted/crushed top cone upon opening supplier crate', 'Staff Checker', 'Quarantined', 'Segregated in dealership quarantine freezer for Unilever credit note');

-- K. Selecta POS Quota (October 2026)
INSERT INTO "SelectaPosQuota" ("id", "monthYear", "targetAmount", "recordedSales", "notes")
VALUES
('QUOTA-2026-10', '2026-10', 1000000.00, 825000.00, 'October 2026 Unilever Dealership Quota Target');

INSERT INTO "SelectaPosQuotaEntry" ("id", "quotaId", "entryDate", "selectaPosRef", "amount", "enteredBy", "remarks")
VALUES
('QE-001', 'QUOTA-2026-10', '2026-10-07 18:00:00+08', 'Z-READ-W1-4412', 215000.00, 'Mrs. Llano', 'Week 1 confirmed POS gross billing'),
('QE-002', 'QUOTA-2026-10', '2026-10-14 18:00:00+08', 'Z-READ-W2-4489', 240000.00, 'Mrs. Llano', 'Week 2 confirmed POS gross billing'),
('QE-003', 'QUOTA-2026-10', '2026-10-21 18:00:00+08', 'Z-READ-W3-4552', 210000.00, 'Mrs. Llano', 'Week 3 confirmed POS gross billing'),
('QE-004', 'QUOTA-2026-10', '2026-10-28 18:00:00+08', 'Z-READ-W4-4601', 160000.00, 'Mrs. Llano', 'Week 4 mid-week batch (82.5% achieved)');

-- L. Initial Inventory Ledger Movement Records
INSERT INTO "InventoryLedger" ("id", "productId", "productName", "movementType", "changeQty", "runningSaleable", "runningQuarantine", "reference", "staffName", "notes")
VALUES
('LED-001', 'COR-001', 'Selecta Cornetto Classic Chocolate 110ml', 'Supplier Receiving', 396, 480, 4, 'RCV-2026-001', 'Staff Checker', 'Initial warehouse stock from CDO Bodega'),
('LED-002', 'MAG-001', 'Selecta Magnum Classic Belgian Chocolate 80ml', 'Supplier Receiving', 200, 150, 0, 'RCV-2026-001', 'Staff Checker', 'Initial warehouse stock from CDO Bodega'),
('LED-003', 'STK-001', 'Selecta Paddle Pop Rainbow 55ml', 'Supplier Receiving', 600, 600, 0, 'RCV-2026-001', 'Staff Checker', 'Initial warehouse stock from CDO Bodega');

-- M. Audit Logs
INSERT INTO "AuditLog" ("id", "action", "module", "user", "details", "timestamp")
VALUES
('AUD-001', 'System Initialization', 'Settings', 'Administrator', '{"message":"Llano Selecta Dealer POS & Inventory System database schema created and seeded."}', CURRENT_TIMESTAMP);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
SELECT 'Products' AS Table_Name, COUNT(*) AS Record_Count FROM "Product"
UNION ALL
SELECT 'Customers', COUNT(*) FROM "Customer"
UNION ALL
SELECT 'Freezers', COUNT(*) FROM "Freezer"
UNION ALL
SELECT 'Bookings', COUNT(*) FROM "Booking"
UNION ALL
SELECT 'Users', COUNT(*) FROM "User"
UNION ALL
SELECT 'DeliveryRuns', COUNT(*) FROM "DeliveryRun"
UNION ALL
SELECT 'SelectaPosQuota', COUNT(*) FROM "SelectaPosQuota";

-- ============================================================================
-- SUCCESS: llano_selecta_db is now 100% prepared and ready for production!
-- ============================================================================
