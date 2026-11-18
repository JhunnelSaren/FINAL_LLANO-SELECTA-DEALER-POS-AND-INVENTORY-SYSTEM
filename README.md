# Llano Selecta POS and Inventory

Point of sale, booking, freezer van receiving, inventory, delivery, reconciliation, store, freezer, and reporting tools for the Valencia, Cabanglasan, and San Fernando areas.

## Local setup

1. Copy `server/.env.example` to `server/.env` and set a private `JWT_SECRET`. The real `server/.env` file is ignored by Git.
2. From the project folder, run:

   ```powershell
   npm run install:all
   npm run setup
   ```

   `npm run setup` prepares the local SQLite schema and ensures the initial accounts and settings exist. The local database file is `server/prisma/pos_local.db`. Setup preserves existing account passwords and statuses. The optional `npm run prisma:seed` command adds sample operating records; use it only in a development database.

`server/prisma/schema.sqlite.prisma` is the source of truth for local SQLite and the Turso/libSQL production database. The MySQL schema remains available with `npm run setup:mysql`.

After setup, start the system from the project folder with:

```powershell
npm run dev
```

- Web app: <http://localhost:5173>
- API health: <http://localhost:5000/api/health>

## First sign-in

| Role | Username | Initial password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Staff | `staff` | `staff123` |

Change these passwords after the first sign-in. Admins can add, edit, disable, re-enable, or delete staff accounts in **Settings → Staff Accounts**. At least one active Admin account must remain.

## Daily workflows

- Book stores by area and choose product category and flavor.
- New bookings start as **Booked**, receive a unique `BK-YYYY-NNN` number, and are saved to the database. Creating a booking does not change inventory.
- Record freezer van receipts with the receipt image, date, time, and received quantities. Saleable quantities and damaged stock are posted to inventory history together.
- Create area-specific delivery runs from that area's waiting bookings. Record Cash, GCash, or bank check payments, missing goods, and BO returns at each stop. Reconcile completed runs to close out stock and update booking statuses. Failed stops are recorded as backloads.
- Store and freezer lists feed the other modules' area-filtered dropdowns. Staff notifications show incoming bookings, deliveries, receipts, and low stock.

## Build checks

```powershell
npm run build
npm test
```

## Vercel and Turso deployment

The Vercel project is configured to build the Vite client and Express API from this repository. Production must use `DB_PROVIDER=turso` and the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` values from the Turso database. Set a unique `JWT_SECRET` for production. Persistent image and receipt uploads use Vercel Blob through `BLOB_READ_WRITE_TOKEN`; Vercel Functions cannot retain files written to their local filesystem.

For a new empty Turso database, set the Turso values in the environment and run `npm run db:init:turso` once. This command stops if it finds existing tables. Do not run it against a database that already contains production data.

Keep the existing local SQLite database as the source of POS records during setup. Before production is opened to staff, transfer the required records and any referenced uploads into Turso and Vercel Blob, then verify the first admin sign-in and key POS workflows.
