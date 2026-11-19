import { PrismaClient as MySQLPrismaClient } from '../generated-prisma/index.js';
import { PrismaClient as SQLitePrismaClient } from '../generated-prisma-sqlite/index.js';
import path from 'path';

async function migrateData() {
  console.log('🔄 Starting data copy from MySQL (llano_selecta_db) to SQLite (pos_local.db)...');

  const mysql = new MySQLPrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/llano_selecta_db',
      },
    },
  });

  const sqliteDbPath = path.resolve(__dirname, 'pos_local.db');
  const sqlite = new SQLitePrismaClient({
    datasources: {
      db: {
        url: `file:${sqliteDbPath}`,
      },
    },
  });

  try {
    // Disable foreign key constraints during batch transfer
    await sqlite.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

    const models: { name: string; key: keyof typeof mysql }[] = [
      { name: 'User', key: 'user' as any },
      { name: 'Product', key: 'product' as any },
      { name: 'Customer', key: 'customer' as any },
      { name: 'Freezer', key: 'freezer' as any },
      { name: 'FreezerTransaction', key: 'freezerTransaction' as any },
      { name: 'FreezerVerification', key: 'freezerVerification' as any },
      { name: 'Booking', key: 'booking' as any },
      { name: 'BookingItem', key: 'bookingItem' as any },
      { name: 'BodegaOrder', key: 'bodegaOrder' as any },
      { name: 'BodegaOrderItem', key: 'bodegaOrderItem' as any },
      { name: 'StockReceiving', key: 'stockReceiving' as any },
      { name: 'StockReceivingItem', key: 'stockReceivingItem' as any },
      { name: 'DeliveryRun', key: 'deliveryRun' as any },
      { name: 'DeliveryStop', key: 'deliveryStop' as any },
      { name: 'DeliveryItem', key: 'deliveryItem' as any },
      { name: 'CustomerInvoice', key: 'customerInvoice' as any },
      { name: 'PaymentTransaction', key: 'paymentTransaction' as any },
      { name: 'RouteReconciliation', key: 'routeReconciliation' as any },
      { name: 'UserNotificationState', key: 'userNotificationState' as any },
      { name: 'InventoryLedger', key: 'inventoryLedger' as any },
      { name: 'BoDiscrepancy', key: 'boDiscrepancy' as any },
      { name: 'SelectaPosQuota', key: 'selectaPosQuota' as any },
      { name: 'SelectaPosQuotaEntry', key: 'selectaPosQuotaEntry' as any },
      { name: 'AuditLog', key: 'auditLog' as any },
      { name: 'SystemSetting', key: 'systemSetting' as any },
      { name: 'StockAdjustmentRequest', key: 'stockAdjustmentRequest' as any },
    ];

    let totalMigrated = 0;

    for (const { name, key } of models) {
      const mysqlDelegate = mysql[key] as any;
      const sqliteDelegate = sqlite[key] as any;

      if (!mysqlDelegate || !sqliteDelegate) {
        console.warn(`⚠️ Skipped model ${name}: delegate not found.`);
        continue;
      }

      // Clear existing records in sqlite for clean sync
      await sqliteDelegate.deleteMany({});

      const records = await mysqlDelegate.findMany({});
      if (records.length > 0) {
        // SQLite doesn't support bulk createMany with certain relations or versions, so create or batch
        for (const record of records) {
          await sqliteDelegate.create({ data: record });
        }
        console.log(`  ✓ Transferred ${records.length} ${name} record(s)`);
        totalMigrated += records.length;
      } else {
        console.log(`  - 0 ${name} records found in MySQL`);
      }
    }

    // Re-enable foreign key constraints
    await sqlite.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

    console.log(`\n🎉 Data sync complete! Transferred ${totalMigrated} total records into pos_local.db`);
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  } finally {
    await mysql.$disconnect();
    await sqlite.$disconnect();
  }
}

migrateData();
