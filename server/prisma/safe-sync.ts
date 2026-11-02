import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import prisma from '../src/db.js';

type TableRow = { tableName: string };
type ColumnRow = { isNullable: string };
type IndexRow = { indexName: string };

const existingDatabaseTables = [
  'user', 'product', 'customer', 'freezer', 'freezerverification', 'booking', 'bookingitem',
  'bodegaorder', 'bodegaorderitem', 'stockreceiving', 'stockreceivingitem', 'deliveryrun',
  'deliverystop', 'deliveryitem', 'customerinvoice', 'paymenttransaction', 'routereconciliation',
  'inventoryledger', 'bodiscrepancy', 'selectaposquota', 'selectaposquotaentry', 'auditlog', 'systemsetting',
];

function quoteIdentifier(value: string) {
  return `\`${value.replace(/`/g, '``')}\``;
}

async function findTable(tableName: string) {
  const [row] = await prisma.$queryRaw<TableRow[]>`
    SELECT TABLE_NAME AS tableName
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(${tableName})
    LIMIT 1
  `;
  return row?.tableName;
}

async function ensureColumn(tableName: string, columnName: string, definition: string) {
  const table = await findTable(tableName);
  if (!table) throw new Error(`Required MySQL table ${tableName} does not exist.`);

  const [column] = await prisma.$queryRaw<ColumnRow[]>`
    SELECT IS_NULLABLE AS isNullable
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND LOWER(TABLE_NAME) = LOWER(${table})
      AND LOWER(COLUMN_NAME) = LOWER(${columnName})
    LIMIT 1
  `;
  if (!column) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(columnName)} ${definition}`,
    );
    console.log(`Added MySQL column ${table}.${columnName}.`);
  }
}

async function ensureUniqueIndex(tableName: string, indexName: string, columnName: string) {
  const table = await findTable(tableName);
  if (!table) throw new Error(`Required MySQL table ${tableName} does not exist.`);

  const [index] = await prisma.$queryRaw<IndexRow[]>`
    SELECT INDEX_NAME AS indexName
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND LOWER(TABLE_NAME) = LOWER(${table})
      AND LOWER(INDEX_NAME) = LOWER(${indexName})
    LIMIT 1
  `;
  if (!index) {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX ${quoteIdentifier(indexName)} ON ${quoteIdentifier(table)} (${quoteIdentifier(columnName)})`,
    );
  }
}

async function createEmptyDatabaseSchema() {
  const prismaCli = path.resolve(__dirname, '../node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Unable to create the initial MySQL schema.');
}

async function main() {
  await prisma.$connect();
  const tables = await prisma.$queryRaw<TableRow[]>`
    SELECT TABLE_NAME AS tableName
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
  `;

  if (tables.length === 0) {
    await prisma.$disconnect();
    await createEmptyDatabaseSchema();
    console.log('Created the initial MySQL schema from Prisma.');
    return;
  }

  const present = new Set(tables.map(({ tableName }) => tableName.toLowerCase()));
  const missing = existingDatabaseTables.filter((table) => !present.has(table));
  if (missing.length > 0) {
    throw new Error(`The existing MySQL database is missing required tables: ${missing.join(', ')}.`);
  }

  const additions = [
    ['user', 'accessKey', 'VARCHAR(191) NULL'],
    ['product', 'flavor', 'VARCHAR(191) NULL'],
    ['customer', 'lastOrderAt', 'DATETIME(3) NULL'],
    ['customer', 'storePhotoPath', 'TEXT NULL'],
    ['DeliveryRun', 'area', "VARCHAR(191) NOT NULL DEFAULT 'Valencia'"],
    ['DeliveryItem', 'category', 'VARCHAR(191) NULL'],
    ['CustomerInvoice', 'boDeductionAmount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'],
    ['CustomerInvoice', 'grossDeliveryAmount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'],
    ['CustomerInvoice', 'shortDeductionAmount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'],
    ['CustomerInvoice', 'intactReturnDeductionAmount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'],
    ['InventoryLedger', 'category', 'VARCHAR(191) NULL'],
    ['BoDiscrepancy', 'customerId', 'VARCHAR(191) NULL'],
    ['SystemSetting', 'loginPageConfig', 'TEXT NULL'],
  ] as const;

  for (const [table, column, definition] of additions) {
    await ensureColumn(table, column, definition);
  }
  await ensureUniqueIndex('user', 'user_accessKey_key', 'accessKey');

  const bookingTable = await findTable('Booking');
  if (!bookingTable) throw new Error('Required MySQL table Booking does not exist.');
  const [requestedDate] = await prisma.$queryRaw<ColumnRow[]>`
    SELECT IS_NULLABLE AS isNullable
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND LOWER(TABLE_NAME) = LOWER(${bookingTable})
      AND LOWER(COLUMN_NAME) = 'requesteddeliverydate'
    LIMIT 1
  `;
  if (!requestedDate) {
    await ensureColumn('Booking', 'requestedDeliveryDate', 'DATETIME(3) NULL');
  } else if (requestedDate.isNullable === 'NO') {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${quoteIdentifier(bookingTable)} MODIFY COLUMN ${quoteIdentifier('requestedDeliveryDate')} DATETIME(3) NULL`,
    );
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier('FreezerTransaction')} (
      ${quoteIdentifier('id')} VARCHAR(64) NOT NULL,
      ${quoteIdentifier('freezerId')} VARCHAR(64) NOT NULL,
      ${quoteIdentifier('action')} VARCHAR(191) NOT NULL,
      ${quoteIdentifier('fromCustomerId')} VARCHAR(191) NULL,
      ${quoteIdentifier('fromStoreName')} VARCHAR(191) NULL,
      ${quoteIdentifier('fromArea')} VARCHAR(191) NULL,
      ${quoteIdentifier('toCustomerId')} VARCHAR(191) NULL,
      ${quoteIdentifier('toStoreName')} VARCHAR(191) NULL,
      ${quoteIdentifier('toArea')} VARCHAR(191) NULL,
      ${quoteIdentifier('reason')} TEXT NOT NULL,
      ${quoteIdentifier('performedBy')} VARCHAR(191) NOT NULL,
      ${quoteIdentifier('createdAt')} DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (${quoteIdentifier('id')}),
      INDEX ${quoteIdentifier('FreezerTransaction_freezerId_createdAt_idx')} (${quoteIdentifier('freezerId')}, ${quoteIdentifier('createdAt')}),
      CONSTRAINT ${quoteIdentifier('FreezerTransaction_freezerId_fkey')}
        FOREIGN KEY (${quoteIdentifier('freezerId')}) REFERENCES ${quoteIdentifier('Freezer')} (${quoteIdentifier('id')})
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier('usernotificationstate')} (
      ${quoteIdentifier('id')} VARCHAR(64) NOT NULL,
      ${quoteIdentifier('userId')} VARCHAR(64) NOT NULL,
      ${quoteIdentifier('notificationId')} VARCHAR(120) NOT NULL,
      ${quoteIdentifier('isRead')} TINYINT(1) NOT NULL DEFAULT 0,
      ${quoteIdentifier('isDeleted')} TINYINT(1) NOT NULL DEFAULT 0,
      ${quoteIdentifier('createdAt')} DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      ${quoteIdentifier('updatedAt')} DATETIME(3) NOT NULL,
      PRIMARY KEY (${quoteIdentifier('id')}),
      UNIQUE INDEX ${quoteIdentifier('usernotificationstate_userId_notificationId_key')} (${quoteIdentifier('userId')}, ${quoteIdentifier('notificationId')}),
      INDEX ${quoteIdentifier('usernotificationstate_userId_isDeleted_idx')} (${quoteIdentifier('userId')}, ${quoteIdentifier('isDeleted')})
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  const customerTable = await findTable('customer');
  const bookingsTable = await findTable('Booking');
  if (!customerTable || !bookingsTable) throw new Error('Required customer or booking MySQL table is missing.');
  await prisma.$executeRawUnsafe(`
    UPDATE ${quoteIdentifier(customerTable)} AS c
    SET c.${quoteIdentifier('lastOrderAt')} = NULL
    WHERE c.${quoteIdentifier('lastOrderAt')} = c.${quoteIdentifier('createdAt')}
      AND NOT EXISTS (
        SELECT 1
        FROM ${quoteIdentifier(bookingsTable)} AS b
        WHERE b.${quoteIdentifier('customerId')} = c.${quoteIdentifier('id')}
          AND b.${quoteIdentifier('status')} <> 'Cancelled'
      )
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE ${quoteIdentifier(customerTable)} AS c
    SET c.${quoteIdentifier('lastOrderAt')} = (
      SELECT MAX(b.${quoteIdentifier('bookingDate')})
      FROM ${quoteIdentifier(bookingsTable)} AS b
      WHERE b.${quoteIdentifier('customerId')} = c.${quoteIdentifier('id')}
        AND b.${quoteIdentifier('status')} <> 'Cancelled'
    )
    WHERE c.${quoteIdentifier('lastOrderAt')} IS NULL
      AND EXISTS (
        SELECT 1
        FROM ${quoteIdentifier(bookingsTable)} AS b
        WHERE b.${quoteIdentifier('customerId')} = c.${quoteIdentifier('id')}
          AND b.${quoteIdentifier('status')} <> 'Cancelled'
      )
  `);

  console.log('Existing MySQL schema is aligned. Existing records and columns were retained.');
}

main()
  .catch((error) => {
    console.error('Unable to align the MySQL database:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
