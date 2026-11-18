import { PrismaClient as MySQLPrismaClient } from '../generated-prisma/index.js';
import { PrismaClient as SQLitePrismaClient } from '../generated-prisma-sqlite/index.js';
import path from 'path';

const provider = (process.env.DB_PROVIDER || 'mysql').toLowerCase().trim();

let client: any;

if (provider === 'sqlite' || provider === 'turso') {
  // Always resolve to absolute path so it works reliably from any current working directory
  const defaultDbFile = path.resolve(__dirname, '../prisma/pos_local.db').replace(/\\/g, '/');
  let sqliteUrl = `file:${defaultDbFile}`;

  if (process.env.SQLITE_DATABASE_URL && !process.env.SQLITE_DATABASE_URL.startsWith('file:.')) {
    sqliteUrl = process.env.SQLITE_DATABASE_URL;
  }

  client = new SQLitePrismaClient({
    datasources: {
      db: {
        url: sqliteUrl,
      },
    },
  });
  console.log(`[Database Engine] Active provider: ${provider.toUpperCase()} (${sqliteUrl})`);
} else {
  client = new MySQLPrismaClient();
  console.log(`[Database Engine] Active provider: MYSQL (${process.env.DATABASE_URL || 'default'})`);
}

// Export typed as MySQLPrismaClient so existing TypeScript definitions in all routes match seamlessly
const prisma = client as MySQLPrismaClient;

export default prisma;
