-- ============================================================================
-- LLANO SELECTA DEALER POS AND INVENTORY SYSTEM
-- DATABASE UPDATE & SYNCHRONIZATION SCRIPT FOR MYSQL (llano_selecta_db)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `llano_selecta_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `llano_selecta_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. ENSURE BASE SCHEMA AND REQUIRED COLUMNS
-- ----------------------------------------------------------------------------

-- A. Table: user
CREATE TABLE IF NOT EXISTS `user` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `role` VARCHAR(191) NOT NULL,
  `accessKey` VARCHAR(191) NULL UNIQUE,
  `passwordHash` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
  `permissions` TEXT NULL,
  `lastLogin` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- B. Table: product
CREATE TABLE IF NOT EXISTS `product` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `sku` VARCHAR(191) NULL UNIQUE,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `flavor` VARCHAR(191) NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'Piece',
  `dealerPrice` DECIMAL(12, 2) NULL DEFAULT 0.00,
  `sellingPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `srp` DECIMAL(12, 2) NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `quarantineStock` INT NOT NULL DEFAULT 0,
  `reservedStock` INT NOT NULL DEFAULT 0,
  `minStock` INT NOT NULL DEFAULT 15,
  `barcode` VARCHAR(191) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- C. Table: customer
CREATE TABLE IF NOT EXISTS `customer` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `storeName` VARCHAR(191) NOT NULL,
  `ownerName` VARCHAR(191) NULL,
  `contact` VARCHAR(191) NULL,
  `area` VARCHAR(191) NOT NULL,
  `subArea` VARCHAR(191) NULL,
  `purok` VARCHAR(191) NULL,
  `route` VARCHAR(191) NULL,
  `address` TEXT NULL,
  `freezerSerial` VARCHAR(191) NULL,
  `barcodeNo` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
  `notes` TEXT NULL,
  `currentBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastOrderAt` DATETIME(3) NULL,
  `storePhotoPath` TEXT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- D. Table: CustomerInvoice
CREATE TABLE IF NOT EXISTS `CustomerInvoice` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `invoiceNumber` VARCHAR(191) NOT NULL UNIQUE,
  `deliveryStopId` VARCHAR(191) NULL UNIQUE,
  `customerId` VARCHAR(191) NOT NULL,
  `storeName` VARCHAR(191) NOT NULL,
  `invoiceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `grossDeliveryAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `billableProductAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `boDeductionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `shortDeductionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `intactReturnDeductionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `otherCharges` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `approvedDiscounts` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `priorBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `netAmountDue` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `totalPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `balanceRemaining` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'Unpaid',
  `collectorName` VARCHAR(191) NULL,
  `customerSignature` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- E. Table: FreezerTransaction
CREATE TABLE IF NOT EXISTS `FreezerTransaction` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `freezerId` VARCHAR(64) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `fromCustomerId` VARCHAR(191) NULL,
  `fromStoreName` VARCHAR(191) NULL,
  `fromArea` VARCHAR(191) NULL,
  `toCustomerId` VARCHAR(191) NULL,
  `toStoreName` VARCHAR(191) NULL,
  `toArea` VARCHAR(191) NULL,
  `reason` TEXT NOT NULL,
  `performedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `FreezerTransaction_freezerId_createdAt_idx` (`freezerId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. SAFE ADDITIVE COLUMN UPDATES FOR EXISTING TABLES
-- ----------------------------------------------------------------------------

-- Add flavor to product if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND COLUMN_NAME = 'flavor';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `product` ADD COLUMN `flavor` VARCHAR(191) NULL AFTER `category`;', 'SELECT "flavor column exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add boDeductionAmount to CustomerInvoice if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CustomerInvoice' AND COLUMN_NAME = 'boDeductionAmount';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `CustomerInvoice` ADD COLUMN `boDeductionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `billableProductAmount`;', 'SELECT "boDeductionAmount exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add grossDeliveryAmount to CustomerInvoice if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CustomerInvoice' AND COLUMN_NAME = 'grossDeliveryAmount';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `CustomerInvoice` ADD COLUMN `grossDeliveryAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `invoiceDate`;', 'SELECT "grossDeliveryAmount exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add shortDeductionAmount to CustomerInvoice if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CustomerInvoice' AND COLUMN_NAME = 'shortDeductionAmount';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `CustomerInvoice` ADD COLUMN `shortDeductionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `boDeductionAmount`;', 'SELECT "shortDeductionAmount exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add intactReturnDeductionAmount to CustomerInvoice if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CustomerInvoice' AND COLUMN_NAME = 'intactReturnDeductionAmount';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `CustomerInvoice` ADD COLUMN `intactReturnDeductionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `shortDeductionAmount`;', 'SELECT "intactReturnDeductionAmount exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add currentBalance to customer if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer' AND COLUMN_NAME = 'currentBalance';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `customer` ADD COLUMN `currentBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `notes`;', 'SELECT "currentBalance exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add area to DeliveryRun if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeliveryRun' AND COLUMN_NAME = 'area';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `DeliveryRun` ADD COLUMN `area` VARCHAR(191) NOT NULL DEFAULT "Valencia" AFTER `route`;', 'SELECT "area exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add category to DeliveryItem if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeliveryItem' AND COLUMN_NAME = 'category';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `DeliveryItem` ADD COLUMN `category` VARCHAR(191) NULL AFTER `productName`;', 'SELECT "category in DeliveryItem exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add category to InventoryLedger if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'InventoryLedger' AND COLUMN_NAME = 'category';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `InventoryLedger` ADD COLUMN `category` VARCHAR(191) NULL AFTER `productName`;', 'SELECT "category in InventoryLedger exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add customerId to BoDiscrepancy if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BoDiscrepancy' AND COLUMN_NAME = 'customerId';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `BoDiscrepancy` ADD COLUMN `customerId` VARCHAR(191) NULL AFTER `storeName`;', 'SELECT "customerId in BoDiscrepancy exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add accessKey to user if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'accessKey';
SET @query = IF(@col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `accessKey` VARCHAR(191) NULL UNIQUE AFTER `role`;', 'SELECT "accessKey exists";');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3. SYNCHRONIZE CORE SELECTA PRODUCT FLAVORS AND CATEGORIES
-- ----------------------------------------------------------------------------

UPDATE `product` SET `flavor` = 'Chocolate', `category` = 'CORNETTO', `sellingPrice` = 28.00 WHERE `id` = 'COR-001' OR `sku` = 'COR-001';
UPDATE `product` SET `flavor` = 'Vanilla', `category` = 'CORNETTO', `sellingPrice` = 28.00 WHERE `id` = 'COR-002' OR `sku` = 'COR-002';
UPDATE `product` SET `flavor` = 'Cookies & Dream', `category` = 'CORNETTO', `sellingPrice` = 28.00 WHERE `id` = 'COR-003' OR `sku` = 'COR-003';
UPDATE `product` SET `flavor` = 'Classic', `category` = 'MAGNUM', `sellingPrice` = 65.00 WHERE `id` = 'MAG-001' OR `sku` = 'MAG-001';
UPDATE `product` SET `flavor` = 'Almond', `category` = 'MAGNUM', `sellingPrice` = 65.00 WHERE `id` = 'MAG-002' OR `sku` = 'MAG-002';
UPDATE `product` SET `flavor` = 'White Almond', `category` = 'MAGNUM', `sellingPrice` = 65.00 WHERE `id` = 'MAG-003' OR `sku` = 'MAG-003';
UPDATE `product` SET `flavor` = 'Cookies & Cream', `category` = 'STICKS', `sellingPrice` = 248.20 WHERE `id` = 'STK-001' OR `sku` = 'STK-001';
UPDATE `product` SET `flavor` = 'Choco Berry', `category` = 'STICKS', `sellingPrice` = 248.20 WHERE `id` = 'STK-002' OR `sku` = 'STK-002';
UPDATE `product` SET `flavor` = 'Double Dutch', `category` = 'SUPREME 1.3L', `sellingPrice` = 260.00 WHERE `id` = 'SUP-001' OR `sku` = 'SUP-001';
UPDATE `product` SET `flavor` = 'Rocky Road', `category` = 'SUPREME 1.3L', `sellingPrice` = 260.00 WHERE `id` = 'SUP-002' OR `sku` = 'SUP-002';
UPDATE `product` SET `flavor` = 'Cookies & Cream', `category` = 'SUPREME 1.3L', `sellingPrice` = 260.00 WHERE `id` = 'SUP-003' OR `sku` = 'SUP-003';
UPDATE `product` SET `flavor` = 'Quezo Real', `category` = 'SUPREME 1.3L', `sellingPrice` = 260.00 WHERE `id` = 'SUP-004' OR `sku` = 'SUP-004';

-- Ensure all other products have a readable flavor fallback if null
UPDATE `product` 
SET `flavor` = TRIM(SUBSTRING_INDEX(REPLACE(REPLACE(`name`, 'Selecta ', ''), CONCAT(' (', `category`, ')'), ''), ' 1.3L', 1))
WHERE (`flavor` IS NULL OR `flavor` = '') AND `name` IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- DATABASE SYNCHRONIZATION COMPLETE
-- ============================================================================
