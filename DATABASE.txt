-- =========================================================================
-- LLANO SELECTA DEALER POS AND INVENTORY SYSTEM
-- FULL MASTER DATABASE SCHEMA & QUERIES FOR PGADMIN 4 / POSTGRESQL 18
-- Database Name: llano_selecta_db
-- Connection: postgresql://postgres:032422@localhost:5432/llano_selecta_db
-- Locations Covered: Valencia City, Cabanglasan, San Fernando (Bukidnon)
-- =========================================================================

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. USERS & ACCESS KEYS (Dealer Admin & Dealer Staff - No Emoji Badges)
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Staff')),
    access_key VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

INSERT INTO users (id, username, name, email, role, access_key, password_hash, phone, status) VALUES
('USR-ADMIN', 'admin', 'Dealer Admin', 'admin@selecta.com', 'Admin', 'SELECTA-ADMIN-2026', 'admin123', '0917-000-0001', 'Active'),
('USR-STAFF', 'staff', 'Dealer Staff', 'staff@selecta.com', 'Staff', 'SELECTA-STAFF-2026', 'staff123', '0917-000-0002', 'Active')
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
role = EXCLUDED.role,
access_key = EXCLUDED.access_key,
password_hash = EXCLUDED.password_hash;


-- =========================================================================
-- 2. PRODUCTS MASTER CATALOG (Selecta SKUs with Dealer Price, SRP & Stock)
-- =========================================================================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    dealer_price NUMERIC(10, 2),
    srp NUMERIC(10, 2),
    stock INT DEFAULT 50,
    min_stock INT DEFAULT 15,
    unit VARCHAR(50) DEFAULT 'Pack',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dealer_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS srp NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 50;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Pack';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

INSERT INTO products (id, barcode, name, category, unit_price, dealer_price, srp, stock, min_stock, unit) VALUES
('COR-001', '480001600101', 'CHOCOLATE (CORNETTO)', 'CORNETTO', 28.00, 28.00, 35.00, 150, 30, 'Piece'),
('COR-002', '480001600102', 'VANILLA (CORNETTO)', 'CORNETTO', 28.00, 28.00, 35.00, 120, 30, 'Piece'),
('COR-003', '480001600103', 'COOKIES & DREAM (CORNETTO)', 'CORNETTO', 28.00, 28.00, 35.00, 95, 25, 'Piece'),
('MAG-001', '480001600201', 'CLASSIC (MAGNUM)', 'MAGNUM', 65.00, 65.00, 75.00, 80, 20, 'Piece'),
('MAG-002', '480001600202', 'ALMOND (MAGNUM)', 'MAGNUM', 65.00, 65.00, 75.00, 70, 20, 'Piece'),
('MAG-003', '480001600203', 'WHITE ALMOND (MAGNUM)', 'MAGNUM', 65.00, 65.00, 75.00, 60, 20, 'Piece'),
('STK-001', '480001600001', 'COOKIES & CREAM (STICKS)', 'STICKS', 248.20, 248.20, 275.00, 110, 25, 'Pack'),
('STK-002', '480001600002', 'CHOCO BERRY (STICKS)', 'STICKS', 248.20, 248.20, 275.00, 90, 25, 'Pack'),
('SUP-001', '480001600301', 'DOUBLE DUTCH 1.3L', 'SUPREME 1.3L', 260.00, 260.00, 299.00, 45, 10, 'Tub'),
('SUP-002', '480001600302', 'ROCKY ROAD 1.3L', 'SUPREME 1.3L', 260.00, 260.00, 299.00, 50, 10, 'Tub'),
('SUP-003', '480001600303', 'COOKIES & CREAM 1.3L', 'SUPREME 1.3L', 260.00, 260.00, 299.00, 65, 10, 'Tub'),
('SUP-004', '480001600304', 'QUEZO REAL 1.3L', 'SUPREME 1.3L', 260.00, 260.00, 299.00, 40, 10, 'Tub')
ON CONFLICT (id) DO UPDATE SET
dealer_price = EXCLUDED.dealer_price,
unit_price = EXCLUDED.unit_price,
srp = EXCLUDED.srp,
stock = EXCLUDED.stock;


-- =========================================================================
-- 3. CUSTOMERS & STORES MASTER (Valencia, Cabanglasan, San Fernando)
-- =========================================================================
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    owner VARCHAR(255),
    date_joined DATE DEFAULT CURRENT_DATE,
    area VARCHAR(255) NOT NULL,
    sub_area VARCHAR(255),
    purok VARCHAR(255),
    route VARCHAR(255),
    contact VARCHAR(50),
    freezer_serial VARCHAR(100),
    barcode_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    deployment_paper_ref VARCHAR(100),
    deployment_paper_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_joined DATE DEFAULT CURRENT_DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sub_area VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS purok VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS route VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS freezer_serial VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS barcode_no VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deployment_paper_ref VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deployment_paper_photo TEXT;

INSERT INTO customers (id, store_name, owner_name, owner, date_joined, area, sub_area, purok, route, contact, freezer_serial, barcode_no, status, deployment_paper_ref) VALUES
('CUST-001', 'Aling Nena Sari-Sari Store', 'Nena Dela Cruz', 'Nena Dela Cruz', '2026-01-15', 'Valencia', 'Batangan', 'Purok 2', 'Valencia City Route (Batangan)', '0917-123-4567', 'SEL-FRZ-8821', 'BC-8821-VAL', 'Active', 'DP-VAL-2026-101'),
('CUST-002', 'San Isidro Mini-Mart', 'Maria Clara', 'Maria Clara', '2026-02-10', 'Valencia', 'San Isidro', 'Purok 1', 'Valencia City Route (San Isidro)', '0918-234-5678', 'SEL-FRZ-8822', 'BC-8822-VAL', 'Active', 'DP-VAL-2026-102'),
('CUST-003', 'Cabanglasan Highland Corner', 'Ramon Santos', 'Ramon Santos', '2026-02-28', 'Cabanglasan', 'Poblacion', 'Purok 3', 'Cabanglasan Delivery Route', '0919-345-6789', 'SEL-FRZ-9011', 'BC-9011-CAB', 'Active', 'DP-CAB-2026-201'),
('CUST-004', 'Paradise Valley Store', 'Juanita Morales', 'Juanita Morales', '2026-03-02', 'Cabanglasan', 'Paradise', 'Purok 4', 'Cabanglasan Delivery Route', '0928-888-1234', 'SEL-FRZ-9015', 'BC-9015-CAB', 'Active', 'DP-CAB-2026-202'),
('CUST-005', 'Halapitan Trading Post', 'Danilo Reyes', 'Danilo Reyes', '2026-04-01', 'San Fernando', 'Halapitan (Poblacion)', 'Purok 5', 'Valencia -> San Fernando Route', '0922-678-9012', 'SEL-FRZ-9104', 'BC-9104-SFD', 'Active', 'DP-SFD-2026-301'),
('CUST-006', 'Little Baguio Hillside Store', 'Anita Mendoza', 'Anita Mendoza', '2026-04-10', 'San Fernando', 'Little Baguio', 'Purok 2', 'Valencia -> San Fernando Route', '0935-777-4321', 'SEL-FRZ-9108', 'BC-9108-SFD', 'Active', 'DP-SFD-2026-302'),
('CUST-007', 'Kahaponan Grocery Hub', 'Elena Bautista', 'Elena Bautista', '2026-03-05', 'Valencia', 'Kahaponan', 'Purok 3', 'Valencia City Route (Kahaponan)', '0920-456-7890', 'SEL-FRZ-8825', 'BC-8825-VAL', 'Active', 'DP-VAL-2026-103')
ON CONFLICT (id) DO UPDATE SET
store_name = EXCLUDED.store_name,
owner_name = EXCLUDED.owner_name,
owner = EXCLUDED.owner,
sub_area = EXCLUDED.sub_area,
purok = EXCLUDED.purok,
freezer_serial = EXCLUDED.freezer_serial,
barcode_no = EXCLUDED.barcode_no;


-- =========================================================================
-- 4. FREEZERS ASSET MANAGEMENT & CUSTODY TRACKING
-- =========================================================================
CREATE TABLE IF NOT EXISTS freezers (
    id VARCHAR(50) PRIMARY KEY,
    serial_number VARCHAR(100),
    selecta_number VARCHAR(100),
    barcode_no VARCHAR(100),
    barcode VARCHAR(100),
    model VARCHAR(100) NOT NULL,
    assigned_store VARCHAR(255),
    assigned_owner VARCHAR(255),
    area VARCHAR(100) DEFAULT 'Valencia',
    status VARCHAR(50) DEFAULT 'Deployed', -- 'Deployed' or 'Pull Out'
    custody_agreement_date DATE,
    deployment_fee NUMERIC(10, 2) DEFAULT 10000.00,
    timemark_verified BOOLEAN DEFAULT TRUE,
    last_timemark_scan TIMESTAMP,
    scan_photo TEXT,
    condition VARCHAR(100),
    payment_details TEXT,
    last_scan TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE freezers ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS selecta_number VARCHAR(100);
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS barcode_no VARCHAR(100);
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS assigned_owner VARCHAR(255);
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT 'Valencia';
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS custody_agreement_date DATE;
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS deployment_fee NUMERIC(10, 2) DEFAULT 10000.00;
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS timemark_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS last_timemark_scan TIMESTAMP;
ALTER TABLE freezers ADD COLUMN IF NOT EXISTS scan_photo TEXT;

-- Relax legacy not-null constraints if present
DO $$
BEGIN
    ALTER TABLE freezers ALTER COLUMN selecta_number DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE freezers ALTER COLUMN barcode DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

INSERT INTO freezers (id, serial_number, selecta_number, barcode_no, barcode, model, assigned_store, assigned_owner, area, status, custody_agreement_date, deployment_fee, timemark_verified) VALUES
('FRZ-001', 'SEL-FRZ-8821', 'SEL-FRZ-8821', 'BC-8821-VAL', 'BC-8821-VAL', 'Selecta Glass Top 300L', 'Aling Nena Sari-Sari Store', 'Nena Dela Cruz', 'Valencia', 'Deployed', '2026-01-15', 10000.00, TRUE),
('FRZ-002', 'SEL-FRZ-8822', 'SEL-FRZ-8822', 'BC-8822-VAL', 'BC-8822-VAL', 'Selecta Chest Freezer 400L', 'San Isidro Mini-Mart', 'Maria Clara', 'Valencia', 'Deployed', '2026-02-10', 10000.00, TRUE),
('FRZ-003', 'SEL-FRZ-9011', 'SEL-FRZ-9011', 'BC-9011-CAB', 'BC-9011-CAB', 'Selecta Glass Top 300L', 'Cabanglasan Highland Corner', 'Ramon Santos', 'Cabanglasan', 'Deployed', '2026-02-28', 10000.00, TRUE),
('FRZ-004', 'SEL-FRZ-9015', 'SEL-FRZ-9015', 'BC-9015-CAB', 'BC-9015-CAB', 'Selecta Chest Freezer 350L', 'Paradise Valley Store', 'Juanita Morales', 'Cabanglasan', 'Deployed', '2026-03-02', 10000.00, TRUE),
('FRZ-005', 'SEL-FRZ-9104', 'SEL-FRZ-9104', 'BC-9104-SFD', 'BC-9104-SFD', 'Selecta Chest Freezer 400L', 'Halapitan Trading Post', 'Danilo Reyes', 'San Fernando', 'Deployed', '2026-04-01', 10000.00, TRUE),
('FRZ-006', 'SEL-FRZ-9108', 'SEL-FRZ-9108', 'BC-9108-SFD', 'BC-9108-SFD', 'Selecta Glass Top 300L', 'Little Baguio Hillside Store', 'Anita Mendoza', 'San Fernando', 'Deployed', '2026-04-10', 10000.00, TRUE),
('FRZ-007', 'SEL-FRZ-8825', 'SEL-FRZ-8825', 'BC-8825-VAL', 'BC-8825-VAL', 'Selecta Double Door 500L', 'Kahaponan Grocery Hub', 'Elena Bautista', 'Valencia', 'Deployed', '2026-03-05', 10000.00, TRUE),
('FRZ-008', 'SEL-FRZ-8800', 'SEL-FRZ-8800', 'BC-8800-WH', 'BC-8800-WH', 'Selecta Standby Chest 400L', 'Llano Warehouse Central', 'Llano Dealer', 'Valencia', 'Pull Out', '2026-05-01', 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET
area = EXCLUDED.area,
serial_number = EXCLUDED.serial_number,
selecta_number = EXCLUDED.selecta_number,
barcode_no = EXCLUDED.barcode_no,
barcode = EXCLUDED.barcode,
assigned_store = EXCLUDED.assigned_store;


-- =========================================================================
-- 5. STORE BOOKINGS & DELIVERY ORDERS (POS Merged & History)
-- =========================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    store_name VARCHAR(255),
    customer VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    area VARCHAR(255) NOT NULL,
    route VARCHAR(255) NOT NULL,
    booking_date DATE DEFAULT CURRENT_DATE,
    booking_time VARCHAR(50) DEFAULT '09:00 AM',
    status VARCHAR(50) DEFAULT 'Booked',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_total NUMERIC(12, 2) DEFAULT 0.00,
    total_receipt NUMERIC(12, 2) DEFAULT 0.00,
    bo_deductions NUMERIC(10, 2) DEFAULT 0.00,
    missing_deductions NUMERIC(10, 2) DEFAULT 0.00,
    net_delivered_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    shortage_amount NUMERIC(10, 2) DEFAULT 0.00,
    change_amount NUMERIC(10, 2) DEFAULT 0.00,
    delivered_at TIMESTAMP,
    delivered_time VARCHAR(100),
    receipt_ref VARCHAR(100),
    remarks TEXT,
    customer_suggestions TEXT,
    bo_items JSONB DEFAULT '[]'::jsonb,
    missing_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_time VARCHAR(50) DEFAULT '09:00 AM';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimated_total NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_receipt NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bo_deductions NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS missing_deductions NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS net_delivered_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shortage_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivered_time VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS receipt_ref VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_suggestions TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bo_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS missing_items JSONB DEFAULT '[]'::jsonb;

-- Relax legacy not-null constraints if present
DO $$
BEGIN
    ALTER TABLE bookings ALTER COLUMN estimated_total DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE bookings ALTER COLUMN total_receipt DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

INSERT INTO bookings (
    id, store_name, customer, owner_name, area, route, booking_date, booking_time,
    status, estimated_total, total_receipt, bo_deductions, missing_deductions, net_delivered_amount,
    payment_method, paid_amount, shortage_amount, change_amount, delivered_at, delivered_time,
    receipt_ref, remarks, customer_suggestions, items
) VALUES
('BK-2026-1001', 'Aling Nena Sari-Sari Store', 'Aling Nena Sari-Sari Store', 'Nena Dela Cruz', 'Valencia', 'Valencia City Route (Batangan)', '2026-10-24', '09:30 AM', 'Delivered', 26215.60, 26215.60, 280.00, 0.00, 25935.60, 'Cash', 26000.00, 0.00, 64.40, '2026-10-24 11:30:00', '2026-10-24 11:30 AM', 'OR-VAL-8821', 'Delivery completed and verified.', 'Owner requested Selecta promotional banner for front gate.', '[{"id": "COR-001", "name": "CHOCOLATE (CORNETTO)", "category": "CORNETTO", "price": 28.00, "qty": 30}]'::jsonb),
('BK-2026-1002', 'Cabanglasan Highland Corner', 'Cabanglasan Highland Corner', 'Ramon Santos', 'Cabanglasan', 'Cabanglasan Delivery Route', '2026-10-24', '10:15 AM', 'Delivered', 12120.00, 12120.00, 140.00, 0.00, 11980.00, 'Cash', 12000.00, 0.00, 20.00, '2026-10-24 13:45:00', '2026-10-24 01:45 PM', 'OR-CAB-9011', 'Paid in full upon van arrival.', 'Store requested extra Magnum Almond for next week.', '[{"id": "MAG-001", "name": "CLASSIC (MAGNUM)", "category": "MAGNUM", "price": 65.00, "qty": 20}]'::jsonb),
('BK-2026-1003', 'Halapitan Trading Post', 'Halapitan Trading Post', 'Danilo Reyes', 'San Fernando', 'Valencia -> San Fernando Route', '2026-10-24', '11:00 AM', 'Delivered', 2478.00, 2478.00, 165.20, 0.00, 2312.80, 'Cash', 2500.00, 0.00, 187.20, '2026-10-24 15:30:00', '2026-10-24 03:30 PM', 'OR-SFD-401', 'B.O melted tub deducted.', 'Requested Selecta price tag stickers for freezer lid.', '[{"id": "SUP-001", "name": "DOUBLE DUTCH 1.3L", "category": "SUPREME 1.3L", "price": 260.00, "qty": 8}]'::jsonb),
('BK-2026-1004', 'San Isidro Mini-Mart', 'San Isidro Mini-Mart', 'Maria Clara', 'Valencia', 'Valencia City Route (San Isidro)', '2026-10-25', '09:00 AM', 'Ready for Deliver', 15543.64, 15543.64, 0.00, 0.00, 15543.64, 'Cash', 0.00, 0.00, 0.00, NULL, NULL, NULL, 'Packaged in freezer van', 'Needs morning delivery before 10 AM', '[{"id": "COR-001", "name": "CHOCOLATE (CORNETTO)", "category": "CORNETTO", "price": 28.00, "qty": 40}]'::jsonb),
('BK-2026-1005', 'Paradise Valley Store', 'Paradise Valley Store', 'Juanita Morales', 'Cabanglasan', 'Cabanglasan Delivery Route', '2026-10-26', '08:45 AM', 'Booked', 8920.00, 8920.00, 0.00, 0.00, 8920.00, 'Cash', 0.00, 0.00, 0.00, NULL, NULL, NULL, 'Order placed via phone booking', 'Requested Cornetto Disc if available', '[{"id": "COR-002", "name": "VANILLA (CORNETTO)", "category": "CORNETTO", "price": 28.00, "qty": 35}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
status = EXCLUDED.status,
net_delivered_amount = EXCLUDED.net_delivered_amount,
change_amount = EXCLUDED.change_amount,
delivered_time = EXCLUDED.delivered_time;


-- =========================================================================
-- 6. BO (MELTED) LOG & DISCREPANCIES WITH REFUND WORKFLOW
-- =========================================================================
CREATE TABLE IF NOT EXISTS discrepancies (
    id VARCHAR(50) PRIMARY KEY,
    delivery_ref VARCHAR(50),
    area VARCHAR(100),
    store_name VARCHAR(255),
    customer_name VARCHAR(255),
    date DATE DEFAULT CURRENT_DATE,
    product_id VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    flavor VARCHAR(100),
    type VARCHAR(50) NOT NULL DEFAULT 'BO / Melted',
    quantity INT NOT NULL DEFAULT 1,
    discrepancy_qty INT,
    unit_price NUMERIC(10, 2),
    deduction_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    original_invoice NUMERIC(12, 2),
    adjusted_invoice NUMERIC(12, 2),
    reason TEXT,
    recorded_by VARCHAR(255),
    reported_by VARCHAR(255),
    condition VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Logged',
    refund_status VARCHAR(50) DEFAULT 'Refund Requested',
    refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    refund_method VARCHAR(50) DEFAULT 'Cash Refund',
    refund_ref VARCHAR(100),
    refunded_at TIMESTAMP,
    refund_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS area VARCHAR(100);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS product_id VARCHAR(50);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS flavor VARCHAR(100);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS discrepancy_qty INT;
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS reported_by VARCHAR(255);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Logged';
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'Refund Requested';
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50) DEFAULT 'Cash Refund';
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS refund_ref VARCHAR(100);
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS refund_notes TEXT;
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS notes TEXT;

-- Relax legacy not-null constraints if present
DO $$
BEGIN
    ALTER TABLE discrepancies ALTER COLUMN discrepancy_qty DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE discrepancies ALTER COLUMN unit_price DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE discrepancies ALTER COLUMN original_invoice DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE discrepancies ALTER COLUMN adjusted_invoice DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

INSERT INTO discrepancies (
    id, delivery_ref, area, store_name, customer_name, date, product_name, category, flavor,
    type, quantity, discrepancy_qty, unit_price, deduction_amount, reported_by, status, refund_status,
    refund_amount, refund_method, refund_ref, refund_notes, notes
) VALUES
('BO-2026-001', 'DEL-VAL-8821', 'Valencia', 'Aling Nena Sari-Sari Store', 'Aling Nena Sari-Sari Store', '2026-10-24', 'CHOCOLATE (CORNETTO)', 'CORNETTO', 'Chocolate', 'BO / Melted', 5, 5, 28.00, 140.00, 'Field Staff - Juan', 'Logged', 'Refund Requested', 140.00, 'Cash Refund', 'REQ-RF-101', 'Customer reported soft cones due to brownout.', 'Defective freezer seal checked.'),
('BO-2026-002', 'DEL-CAB-9011', 'Cabanglasan', 'Cabanglasan Highland Corner', 'Cabanglasan Highland Corner', '2026-10-24', 'DOUBLE DUTCH 1.3L', 'SUPREME 1.3L', 'Double Dutch', 'BO / Melted', 1, 1, 260.00, 260.00, 'Field Staff - Pedro', 'Refunded', 'Refunded', 260.00, 'Deduction from Next Order', 'RF-CAB-881', 'Admin verified melted tub and credited to store.', 'Melted during transit over rough road.'),
('BO-2026-003', 'DEL-SFD-401', 'San Fernando', 'Halapitan Trading Post', 'Halapitan Trading Post', '2026-10-25', 'CLASSIC (MAGNUM)', 'MAGNUM', 'Classic', 'BO / Melted', 2, 2, 65.00, 130.00, 'Field Staff - Juan', 'Logged', 'Refund Requested', 130.00, 'Cash Refund', 'REQ-RF-102', 'Customer requested cash refund on next delivery cycle.', 'Freezer temperature was set to medium.')
ON CONFLICT (id) DO UPDATE SET
area = EXCLUDED.area,
refund_status = EXCLUDED.refund_status,
refund_amount = EXCLUDED.refund_amount;


-- =========================================================================
-- 7. STOCK RECEIVING (Inbound Van Stock with Category/Product Dropdown & Photo)
-- =========================================================================
CREATE TABLE IF NOT EXISTS stock_receiving (
    id VARCHAR(50) PRIMARY KEY,
    po_number VARCHAR(100) NOT NULL,
    truck_plate VARCHAR(50) NOT NULL,
    driver_info VARCHAR(255),
    arrival_date DATE DEFAULT CURRENT_DATE,
    arrival_time VARCHAR(50) DEFAULT '10:00 AM',
    receiver VARCHAR(255) DEFAULT 'Warehouse Staff',
    checker VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Delivered to Warehouse',
    remarks TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_received_value NUMERIC(12, 2) DEFAULT 0.00,
    receipt_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE stock_receiving ADD COLUMN IF NOT EXISTS receipt_image TEXT;

INSERT INTO stock_receiving (id, po_number, truck_plate, driver_info, arrival_date, arrival_time, receiver, checker, status, remarks, items, total_received_value) VALUES
('RCV-2026-001', 'PO-CDO-99120', 'KAA-8921', 'Rogelio Fernandez (Unilever CDO Plant)', '2026-10-20', '09:30 AM', 'Dealer Staff', 'Warehouse Supervisor', 'Delivered to Warehouse', 'Complete van shipment. Cold temperature verified at -20°C.', '[{"category": "CORNETTO", "productId": "COR-001", "name": "CHOCOLATE (CORNETTO)", "received": 250, "price": 28.00}, {"category": "MAGNUM", "productId": "MAG-001", "name": "CLASSIC (MAGNUM)", "received": 120, "price": 65.00}]'::jsonb, 14800.00)
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- 8. INVENTORY LEDGER (Audit Log of Cold Storage Stock Movements)
-- =========================================================================
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_id VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    type VARCHAR(100) NOT NULL,
    change_qty INT NOT NULL,
    running_on_hand INT NOT NULL DEFAULT 100,
    reference_no VARCHAR(100),
    staff VARCHAR(100),
    notes TEXT
);


-- =========================================================================
-- 9. DELIVERY ROUTES & SCHEDULES
-- =========================================================================
CREATE TABLE IF NOT EXISTS delivery_routes (
    id VARCHAR(50) PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    schedule_days TEXT[],
    coverage_areas TEXT,
    active_stores_count INT DEFAULT 0,
    assigned_driver VARCHAR(255),
    assigned_booker VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active'
);

INSERT INTO delivery_routes (id, route_name, schedule_days, coverage_areas, active_stores_count, assigned_driver, assigned_booker, status) VALUES
('RTE-VAL-01', 'Valencia City Commercial & Rural Route', ARRAY['Monday', 'Wednesday', 'Friday'], 'Valencia City Proper, Batangan, Kahaponan, Mailag, San Isidro, Sinabuagan', 35, 'Juan Dela Cruz', 'Pedro Penduko', 'Active'),
('RTE-CAB-02', 'Cabanglasan Highland Route', ARRAY['Tuesday', 'Thursday'], 'Cabanglasan Town Proper, Paradise, Capihan, Anlogan, Mandaing, Freedom', 22, 'Pedro Driver', 'Pedro Penduko', 'Active'),
('RTE-SFD-03', 'Valencia -> San Fernando Highway Route', ARRAY['Monday', 'Friday'], 'Halapitan, Little Baguio, Kibingkog, Cayaga, Namnam, Iglugsad', 26, 'Juan Dela Cruz', 'Maria Booker', 'Active')
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- 10. SYSTEM SETTINGS & BRANDING
-- =========================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(50) PRIMARY KEY,
    login_photo_url TEXT,
    login_caption TEXT,
    login_description TEXT,
    dealer_logo_url TEXT,
    dealer_name VARCHAR(255),
    contact_number VARCHAR(50),
    address TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (id, login_photo_url, login_caption, login_description, dealer_name, contact_number, address) VALUES
('SYSTEM_SETTINGS', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=2000', 'Selecta Ice Cream Dealer Operations & Cold-Chain Logistics', 'Official authorized distribution management portal for store bookings, freezer asset custody, and collection reconciliation across Valencia, Cabanglasan, and San Fernando, Bukidnon.', 'Llano Selecta Dealer', '0917-123-4567', 'Sayre Highway, Valencia City, Bukidnon')
ON CONFLICT (id) DO UPDATE SET
login_caption = EXCLUDED.login_caption,
login_description = EXCLUDED.login_description;
