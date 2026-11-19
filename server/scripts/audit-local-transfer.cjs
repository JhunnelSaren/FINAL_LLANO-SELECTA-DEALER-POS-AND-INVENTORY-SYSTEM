const path = require('node:path');
const { createClient } = require('@libsql/client');

const databaseFile = path.resolve(__dirname, '../prisma/pos_local.db').replace(/\\/g, '/');
const client = createClient({ url: `file:${databaseFile}` });

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function safeReference(value) {
  const text = String(value);
  if (/^data:/i.test(text)) return '<inline-data>';
  try {
    return path.basename(text.replace(/[?#].*$/, '').replace(/\\/g, '/')) || '<empty-path>';
  } catch {
    return '<unreadable-reference>';
  }
}

function findImageReferences(value, key = '', found = []) {
  if (typeof value === 'string') {
    if (/(photo|image|picture|logo|background|icon|file|path|url)/i.test(key)) {
      found.push({
        field: key,
        reference: safeReference(value),
        inlineBytes: /^data:/i.test(value) ? value.length : undefined,
      });
    }
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => findImageReferences(item, `${key}[${index}]`, found));
  } else if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      findImageReferences(childValue, childKey, found);
    }
  }

  return found;
}

async function main() {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const report = [];

  for (const row of tables.rows) {
    const tableName = String(row.name);
    const table = quoteIdentifier(tableName);
    const count = await client.execute(`SELECT COUNT(*) AS count FROM ${table}`);
    const columns = await client.execute(`PRAGMA table_info(${table})`);
    const photoFields = [];

    for (const column of columns.rows) {
      const columnName = String(column.name);
      if (!/(photo|image|picture|file|path|url|config)/i.test(columnName)) continue;
      const field = quoteIdentifier(columnName);
      const values = await client.execute(
        `SELECT ${field} AS value FROM ${table} WHERE ${field} IS NOT NULL AND ${field} <> ''`,
      );
      if (values.rows.length > 0) {
        const references = columnName === 'loginPageConfig'
          ? values.rows.flatMap((item) => {
              try {
                return findImageReferences(JSON.parse(String(item.value)));
              } catch {
                return [{ field: columnName, reference: '<non-json-config>' }];
              }
            })
          : values.rows.map((item) => safeReference(item.value));
        photoFields.push({
          field: columnName,
          count: values.rows.length,
          references,
        });
      }
    }

    report.push({ table: tableName, rows: Number(count.rows[0]?.count ?? 0), photoFields });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error('Unable to audit the local POS database:', error.message);
    process.exitCode = 1;
  })
  .finally(() => client.close());
