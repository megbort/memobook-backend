import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

export type SqlParams = unknown[];

export interface Db {
  run(sql: string, params?: SqlParams): Promise<{ changes: number; lastID: number }>;
  get<Row = unknown>(sql: string, params?: SqlParams): Promise<Row | undefined>;
  all<Row = unknown>(sql: string, params?: SqlParams): Promise<Row[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const createDb = (filename: string): Db => {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const raw = new sqlite3.Database(filename);

  const run: Db['run'] = (sql, params = []) =>
    new Promise((resolve, reject) => {
      raw.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return reject(err);
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    });

  const get = <Row>(sql: string, params: SqlParams = []) =>
    new Promise<Row | undefined>((resolve, reject) => {
      raw.get<Row>(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

  const all = <Row>(sql: string, params: SqlParams = []) =>
    new Promise<Row[]>((resolve, reject) => {
      raw.all<Row>(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

  const exec = (sql: string) =>
    new Promise<void>((resolve, reject) => {
      raw.exec(sql, (err) => (err ? reject(err) : resolve()));
    });

  const close = () =>
    new Promise<void>((resolve, reject) => {
      raw.close((err) => (err ? reject(err) : resolve()));
    });

  // One shared connection: without this queue, concurrent transactions would interleave.
  let txQueue: Promise<unknown> = Promise.resolve();
  const withTransaction = <T>(fn: () => Promise<T>) => {
    const result = txQueue.then(async () => {
      await run('BEGIN');
      try {
        const value = await fn();
        await run('COMMIT');
        return value;
      } catch (err) {
        await run('ROLLBACK');
        throw err;
      }
    });
    txQueue = result.catch(() => {});
    return result;
  };

  return { run, get, all, exec, close, withTransaction };
};
