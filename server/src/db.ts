import { PrismaClient as MySQLPrismaClient } from '../generated-prisma/index.js';
import { PrismaClient as SQLitePrismaClient } from '../generated-prisma-sqlite/index.js';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import path from 'path';

const configuredDatabaseUrl = process.env.DATABASE_URL || '';
const defaultProvider = process.env.VERCEL
  ? 'turso'
  : configuredDatabaseUrl.startsWith('mysql:')
    ? 'mysql'
    : 'sqlite';
const provider = (process.env.DB_PROVIDER || defaultProvider).toLowerCase().trim();

let client: any;

if (provider === 'turso') {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required when DB_PROVIDER=turso.');
  }

  const libsql = createClient({ url, authToken });
  const adapter = new PrismaLibSQL(libsql);
  client = new SQLitePrismaClient({ adapter });
  console.log('[Database Engine] Active provider: TURSO (libSQL)');
} else if (provider === 'sqlite') {
  // Always resolve to absolute path so it works reliably from any current working directory
  const defaultDbFile = path.resolve(__dirname, '../prisma/pos_local.db').replace(/\\/g, '/');
  let sqliteUrl = `file:${defaultDbFile}`;

  const configuredSqliteUrl = process.env.SQLITE_DATABASE_URL?.trim();
  if (configuredSqliteUrl) {
    const configuredPath = configuredSqliteUrl.startsWith('file:')
      ? configuredSqliteUrl.slice('file:'.length)
      : configuredSqliteUrl;
    const resolvedPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(__dirname, '..', configuredPath);
    sqliteUrl = `file:${resolvedPath.replace(/\\/g, '/')}`;
  }

  client = new SQLitePrismaClient({
    datasources: {
      db: {
        url: sqliteUrl,
      },
    },
  });
  console.log(`[Database Engine] Active provider: SQLITE (${sqliteUrl})`);
} else {
  client = new MySQLPrismaClient();
  console.log('[Database Engine] Active provider: MYSQL');
}

// Export typed as MySQLPrismaClient so existing TypeScript definitions in all routes match seamlessly
const prisma = client as MySQLPrismaClient;

export default prisma;
