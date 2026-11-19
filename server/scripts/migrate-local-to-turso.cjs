const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const serverRoot = path.resolve(__dirname, '..');
const localDatabasePath = path.join(serverRoot, 'prisma', 'pos_local.db');
const localUploadDir = path.join(serverRoot, 'uploads');
const localPublicDir = path.resolve(serverRoot, '..', 'client', 'public');
const isApply = process.argv.includes('--apply');

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function imageMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

function localBasename(value) {
  return path.basename(String(value).replace(/[?#].*$/, '').replace(/\\/g, '/'));
}

function isRemoteOrInline(value) {
  return /^(?:https?:|data:|blob:)/i.test(value);
}

function isLocalUploadReference(value) {
  return /^\/?uploads\//i.test(value) || /^server\/uploads\//i.test(value);
}

async function readSourceSnapshot() {
  if (!fs.existsSync(localDatabasePath)) throw new Error('Local SQLite database was not found.');
  const source = createClient({ url: `file:${localDatabasePath.replace(/\\/g, '/')}` });
  const snapshot = await source.transaction('read');
  try {
    const tableResult = await snapshot.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tables = [];
    for (const item of tableResult.rows) {
      const name = String(item.name);
      const quoted = quoteIdentifier(name);
      const [columnsResult, rowsResult, foreignKeysResult] = await Promise.all([
        snapshot.execute(`PRAGMA table_info(${quoted})`),
        snapshot.execute(`SELECT * FROM ${quoted}`),
        snapshot.execute(`PRAGMA foreign_key_list(${quoted})`),
      ]);
      tables.push({
        name,
        columns: columnsResult.rows.map((column) => String(column.name)),
        rows: rowsResult.rows.map((row) => ({ ...row })),
        foreignKeys: foreignKeysResult.rows.map((foreignKey) => String(foreignKey.table)),
      });
    }
    const integrity = await snapshot.execute('PRAGMA foreign_key_check');
    await snapshot.commit();
    return { source, tables, sourceForeignKeyErrors: integrity.rows.length };
  } catch (error) {
    await snapshot.rollback();
    source.close();
    throw error;
  }
}

function buildTableOrder(tables) {
  const byName = new Map(tables.map((table) => [table.name, table]));
  const dependencies = new Map(tables.map((table) => [table.name, new Set(table.foreignKeys.filter((name) => byName.has(name)))]));
  const ordered = [];
  const pending = new Set(byName.keys());
  while (pending.size) {
    const ready = [...pending].filter((name) => [...dependencies.get(name)].every((dependency) => !pending.has(dependency)));
    if (!ready.length) return { ordered: tables, hasCycle: true };
    for (const name of ready) {
      ordered.push(byName.get(name));
      pending.delete(name);
    }
  }
  return { ordered, hasCycle: false };
}

async function collectPhotoFiles(tables) {
  const filePaths = new Map();
  const missing = new Set();

  function inspectValue(value, fieldName, root = false) {
    if (typeof value !== 'string' || !/(photo|image|picture|logo|background|icon|file|path|url)/i.test(fieldName)) return;
    if (isRemoteOrInline(value)) return;

    const basename = localBasename(value);
    if (!basename || basename === '.' || basename === path.sep) return;
    const uploadPath = path.join(localUploadDir, basename);
    const publicPath = path.join(localPublicDir, basename);
    if (fs.existsSync(uploadPath)) {
      filePaths.set(basename.toLowerCase(), uploadPath);
      return;
    }
    if (fs.existsSync(publicPath)) return;
    if (isLocalUploadReference(value) || (root && /\.(?:jpe?g|png|webp|pdf)$/i.test(basename))) {
      missing.add(basename);
    }
  }

  function inspectJson(value, fieldName) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        const walk = (node, key = '') => {
          if (typeof node === 'string') inspectValue(node, key, /(photo|image|picture|logo|background|icon|file|path|url)/i.test(key));
          else if (Array.isArray(node)) node.forEach((entry) => walk(entry, key));
          else if (node && typeof node === 'object') Object.entries(node).forEach(([childKey, childValue]) => walk(childValue, childKey));
        };
        walk(parsed, fieldName);
      } catch {
        inspectValue(value, fieldName, true);
      }
    }
  }

  for (const table of tables) {
    for (const row of table.rows) {
      for (const [column, value] of Object.entries(row)) {
        if (column === 'loginPageConfig' && typeof value === 'string') inspectJson(value, column);
        else inspectValue(value, column, /(?:photo|image|picture|logo|background|icon|file|path|url)/i.test(column));
      }
    }
  }

  if (missing.size) {
    throw new Error(`Referenced local image files are missing: ${[...missing].slice(0, 8).join(', ')}`);
  }
  return filePaths;
}

function replaceLocalReferences(value, column, blobUrls) {
  if (typeof value !== 'string') return value;
  if (column === 'loginPageConfig') {
    try {
      const config = JSON.parse(value);
      const walk = (node, key = '') => {
        if (typeof node === 'string') {
          if (/(photo|image|picture|logo|background|icon|file|path|url)/i.test(key) && !isRemoteOrInline(node)) {
            return blobUrls.get(localBasename(node).toLowerCase()) || node;
          }
          return node;
        }
        if (Array.isArray(node)) return node.map((entry) => walk(entry, key));
        if (node && typeof node === 'object') {
          return Object.fromEntries(Object.entries(node).map(([childKey, childValue]) => [childKey, walk(childValue, childKey)]));
        }
        return node;
      };
      return JSON.stringify(walk(config, column));
    } catch {
      return blobUrls.get(localBasename(value).toLowerCase()) || value;
    }
  }
  if (/(photo|image|picture|logo|background|icon|file|path|url)/i.test(column) && !isRemoteOrInline(value)) {
    return blobUrls.get(localBasename(value).toLowerCase()) || value;
  }
  return value;
}

async function readTargetTableInfo(target, sourceTables) {
  const result = await target.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const remoteNames = new Set(result.rows.map((row) => String(row.name)));
  const missingTables = sourceTables.map((table) => table.name).filter((name) => !remoteNames.has(name));
  if (missingTables.length) throw new Error(`Turso is missing ${missingTables.length} expected tables.`);

  const nonempty = [];
  for (const table of sourceTables) {
    const name = quoteIdentifier(table.name);
    const count = await target.execute(`SELECT COUNT(*) AS count FROM ${name}`);
    if (Number(count.rows[0]?.count ?? 0) !== 0) nonempty.push(table.name);
    const columns = await target.execute(`PRAGMA table_info(${name})`);
    const targetColumns = new Set(columns.rows.map((column) => String(column.name)));
    if (table.columns.some((column) => !targetColumns.has(column))) {
      throw new Error(`Turso table ${table.name} does not match the local schema.`);
    }
  }
  if (nonempty.length) throw new Error(`Turso is not empty (${nonempty.length} tables already contain rows).`);
  return remoteNames.size;
}

async function uploadPhotos(files, token) {
  const { put } = require('@vercel/blob');
  const urls = new Map();
  for (const [basename, filePath] of files) {
    const result = await put(`migrated/${path.basename(filePath)}`, fs.readFileSync(filePath), {
      access: 'public',
      addRandomSuffix: false,
      contentType: imageMimeType(filePath),
      token,
    });
    urls.set(basename, result.url);
  }
  return urls;
}

async function insertSnapshot(target, tables, order, blobUrls) {
  const transaction = await target.transaction('write');
  try {
    if (order.hasCycle) await transaction.execute('PRAGMA defer_foreign_keys = ON');
    for (const table of order.ordered) {
      if (!table.rows.length) continue;
      const sql = `INSERT INTO ${quoteIdentifier(table.name)} (${table.columns.map(quoteIdentifier).join(', ')}) VALUES (${table.columns.map(() => '?').join(', ')})`;
      const statements = table.rows.map((row) => ({
        sql,
        args: table.columns.map((column) => replaceLocalReferences(row[column], column, blobUrls)),
      }));
      for (let offset = 0; offset < statements.length; offset += 40) {
        await transaction.batch(statements.slice(offset, offset + 40));
      }
    }
    const integrity = await transaction.execute('PRAGMA foreign_key_check');
    if (integrity.rows.length) throw new Error(`Turso foreign-key check found ${integrity.rows.length} issue(s).`);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function verifyCounts(target, tables) {
  const mismatches = [];
  let totalRows = 0;
  for (const table of tables) {
    const result = await target.execute(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.name)}`);
    const actual = Number(result.rows[0]?.count ?? 0);
    totalRows += actual;
    if (actual !== table.rows.length) mismatches.push(table.name);
  }
  if (mismatches.length) throw new Error(`Post-import counts did not match in ${mismatches.length} tables.`);
  return totalRows;
}

async function main() {
  const snapshot = await readSourceSnapshot();
  try {
    const totalRows = snapshot.tables.reduce((sum, table) => sum + table.rows.length, 0);
    const imageFiles = await collectPhotoFiles(snapshot.tables);
    const tableOrder = buildTableOrder(snapshot.tables);
    if (snapshot.sourceForeignKeyErrors) {
      throw new Error(`Local SQLite has ${snapshot.sourceForeignKeyErrors} foreign-key issue(s); fix those before importing.`);
    }

    if (!isApply) {
      console.log(JSON.stringify({ mode: 'dry-run', tables: snapshot.tables.length, totalRows, tablesWithRows: snapshot.tables.filter((table) => table.rows.length).length, referencedImages: imageFiles.size, foreignKeyCycle: tableOrder.hasCycle }));
      return;
    }

    const databaseUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!databaseUrl || !authToken || !blobToken) {
      throw new Error('Apply requires Turso and Vercel Blob credentials in the environment.');
    }

    const target = createClient({ url: databaseUrl, authToken });
    try {
      const remoteTableCount = await readTargetTableInfo(target, snapshot.tables);
      const blobUrls = await uploadPhotos(imageFiles, blobToken);
      await insertSnapshot(target, snapshot.tables, tableOrder, blobUrls);
      const importedRows = await verifyCounts(target, snapshot.tables);
      console.log(JSON.stringify({ mode: 'complete', tables: remoteTableCount, rows: importedRows, imagesUploaded: blobUrls.size, rowCountsVerified: true }));
    } finally {
      target.close();
    }
  } finally {
    snapshot.source.close();
  }
}

main().catch((error) => {
  console.error(`Local-to-Turso migration stopped: ${error.message}`);
  process.exitCode = 1;
});
