import path from 'node:path';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import type { Database as TursoSyncDatabase } from '@tursodatabase/sync';

type Query = { sql: string; args?: unknown[] | Record<string, unknown> };
type QueryResult = {
  columns: string[];
  columnTypes: string[];
  rows: Array<Record<string, unknown> | unknown[]>;
  rowsAffected: number;
  lastInsertRowid?: number;
};
type SyncDatabase = TursoSyncDatabase & {
  batch(statements: Query[], options?: { raw?: boolean }): Promise<QueryResult[]>;
  transactionAsync<T extends (transaction: any) => Promise<unknown>>(callback: T): any;
};
type SyncTransaction = {
  batch(statements: Query[], options?: { raw?: boolean }): Promise<QueryResult[]>;
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class SyncPrismaClient {
  constructor(private readonly getDatabase: () => Promise<SyncDatabase>) {}

  async execute(query: Query): Promise<QueryResult> {
    const database = await this.getDatabase();
    const [result] = await database.batch([query], { raw: true });
    if (!result) throw new Error('Turso Sync returned no result for a Prisma query.');
    return result;
  }

  async transaction(mode = 'deferred') {
    const database = await this.getDatabase();
    const ready = deferred<SyncTransaction>();
    const finish = deferred<void>();
    const transactionFactory = database.transactionAsync(async (transaction: SyncTransaction) => {
      ready.resolve(transaction);
      await finish.promise;
    });
    const transactionPromise = mode === 'immediate'
      ? transactionFactory.immediate()
      : mode === 'exclusive'
        ? transactionFactory.exclusive()
        : transactionFactory.deferred();

    // Attach a handler immediately so a BEGIN failure is also delivered to the
    // waiting caller, without leaving a rejected background promise behind.
    void transactionPromise.catch((error: unknown) => ready.reject(error));
    const transaction = await ready.promise;
    let closed = false;

    return {
      execute: async (query: Query) => {
        if (closed) throw new Error('The Prisma transaction has already ended.');
        const [result] = await transaction.batch([query], { raw: true });
        if (!result) throw new Error('Turso Sync returned no result for a Prisma transaction query.');
        return result;
      },
      commit: async () => {
        if (closed) return;
        closed = true;
        finish.resolve();
        await transactionPromise;
      },
      rollback: async () => {
        if (closed) return;
        closed = true;
        finish.reject(new Error('Prisma transaction rolled back.'));
        try {
          await transactionPromise;
        } catch {
          // The Turso transaction callback rejection is the rollback signal.
        }
      },
    };
  }
}

type SyncState = {
  enabled: boolean;
  phase: 'starting' | 'online' | 'offline' | 'disabled';
  lastSuccessAt: string | null;
  pendingChanges: number | null;
  lastError: string | null;
};

const state: SyncState = {
  enabled: false,
  phase: 'disabled',
  lastSuccessAt: null,
  pendingChanges: null,
  lastError: null,
};

let activeDatabase: SyncDatabase | null = null;
let databaseInitialization: Promise<SyncDatabase> | null = null;
let workersStarted = false;

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function recordSuccess() {
  state.phase = 'online';
  state.lastSuccessAt = new Date().toISOString();
  state.lastError = null;
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'The sync request failed.';
  return message.replace(/(?:Bearer\s+)?[A-Za-z0-9_-]{40,}/g, '[redacted]').slice(0, 240);
}

async function refreshStats(database: SyncDatabase) {
  try {
    const stats = await database.stats();
    state.pendingChanges = Number(stats.cdcOperations ?? 0);
  } catch {
    // Stats are informational; sync remains available when this is unsupported.
  }
}

function startSyncWorkers(database: SyncDatabase) {
  if (workersStarted) return;
  workersStarted = true;

  void (async () => {
    let retryMs = 1_000;
    while (true) {
      try {
        await database.pull();
        recordSuccess();
        retryMs = 1_000;
        await refreshStats(database);
      } catch (error) {
        state.phase = 'offline';
        state.lastError = safeErrorMessage(error);
        await pause(retryMs);
        retryMs = Math.min(retryMs * 2, 30_000);
      }
    }
  })();

  void (async () => {
    let retryMs = 2_000;
    while (true) {
      try {
        await refreshStats(database);
        if ((state.pendingChanges ?? 0) > 0) {
          await database.push();
          recordSuccess();
          await refreshStats(database);
        }
        retryMs = 2_000;
        await pause(2_000);
      } catch (error) {
        state.phase = 'offline';
        state.lastError = safeErrorMessage(error);
        await pause(retryMs);
        retryMs = Math.min(retryMs * 2, 30_000);
      }
    }
  })();

  const checkpointTimer = setInterval(() => {
    void database.checkpoint().catch((error: unknown) => {
      state.lastError = safeErrorMessage(error);
    });
  }, 5 * 60_000);
  checkpointTimer.unref?.();
}

function initializeSyncDatabase(): Promise<SyncDatabase> {
  if (databaseInitialization) return databaseInitialization;

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required when DB_PROVIDER=turso-sync.');
  }

  const localPath = path.resolve(
    process.env.TURSO_SYNC_DATABASE_PATH || path.resolve(__dirname, '../prisma/pos_sync.db'),
  );
  state.enabled = true;
  state.phase = 'starting';
  databaseInitialization = (async () => {
    const { connect } = await import('@tursodatabase/sync');
    const database = await connect({
      path: localPath,
      url,
      authToken,
      longPollTimeoutMs: 5_000,
      tracing: 'error',
    }) as SyncDatabase;

    // A new local replica is hydrated from the migrated cloud copy before the
    // first Prisma query completes. The legacy SQLite file is never opened.
    await database.pull();
    activeDatabase = database;
    recordSuccess();
    await refreshStats(database);
    startSyncWorkers(database);
    return database;
  })().catch((error: unknown) => {
    databaseInitialization = null;
    state.phase = 'offline';
    state.lastError = safeErrorMessage(error);
    throw error;
  });
  return databaseInitialization;
}

export function createTursoSyncPrismaAdapter(): PrismaLibSQL {
  return new PrismaLibSQL(new SyncPrismaClient(initializeSyncDatabase) as any);
}

export async function getTursoSyncStatus() {
  if (!activeDatabase) return { ...state };
  await refreshStats(activeDatabase);
  return { ...state };
}
