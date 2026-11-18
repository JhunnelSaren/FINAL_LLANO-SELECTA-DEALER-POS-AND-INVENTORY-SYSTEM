const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const serverRoot = path.resolve(__dirname, '..');
const generatedClient = path.join(serverRoot, 'generated-prisma', 'index.js');

// The MySQL client is generated during deployment because generated-prisma is gitignored.
// Skip regeneration locally when it already exists, so a running POS process never locks its engine file.
if (fs.existsSync(generatedClient)) process.exit(0);

const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [prismaCli, 'generate', '--schema', 'prisma/schema.prisma'], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Prisma validates this at generation time; generating a client does not connect to this database.
    DATABASE_URL: process.env.DATABASE_URL || 'mysql://build:build@127.0.0.1:3306/build',
  },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
