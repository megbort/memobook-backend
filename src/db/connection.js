const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const createDb = (filename) => {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const raw = new sqlite3.Database(filename);

  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      raw.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    });

  const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
      raw.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

  const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
      raw.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

  const exec = (sql) =>
    new Promise((resolve, reject) => {
      raw.exec(sql, (err) => (err ? reject(err) : resolve()));
    });

  const close = () =>
    new Promise((resolve, reject) => {
      raw.close((err) => (err ? reject(err) : resolve()));
    });

  // One shared connection: without this queue, concurrent transactions would interleave.
  let txQueue = Promise.resolve();
  const withTransaction = (fn) => {
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

module.exports = { createDb };
