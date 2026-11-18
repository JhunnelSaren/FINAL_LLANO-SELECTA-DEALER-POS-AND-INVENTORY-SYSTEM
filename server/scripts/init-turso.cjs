const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@libsql/client');

const serverRoot = path.resolve(__dirname, '..');
const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
  throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before initializing Turso.');
}

async function main() {
  const client = createClient({ url: databaseUrl, authToken });
  try {
    const existingTables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1",
    );
    if (existingTables.rows.length > 0) {
      throw new Error('Turso database already contains tables. Initialization stopped without changing it.');
    }

    const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
    const result = spawnSync(process.execPath, [
      prismaCli,
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      'prisma/schema.sqlite.prisma',
      '--script',
    ], {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: 'file:./pos_local.db' },
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Unable to generate the Turso schema SQL: ${result.stderr || result.stdout}`);
    }

    await client.executeMultiple(result.stdout);
    const tables = await client.execute(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    console.log(`Turso schema initialized (${tables.rows[0]?.count ?? 0} tables).`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error('Unable to initialize Turso:', error.message);
  process.exitCode = 1;
});
