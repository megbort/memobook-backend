const crypto = require('node:crypto');
const { now } = require('../lib/fields');

const logEvent = (db, contactId, type, entityType, entityId, summary, changes = null) =>
  db.run(
    `INSERT INTO timeline_events (id, contactId, type, entityType, entityId, summary, changes, occurredAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      contactId,
      type,
      entityType,
      entityId,
      summary,
      changes ? JSON.stringify(changes) : null,
      now(),
    ],
  );

const diff = (oldRow, newRow, fields) => {
  const changes = {};
  for (const field of fields) {
    const from = oldRow[field] ?? null;
    const to = newRow[field] ?? null;
    if (from !== to) changes[field] = { from, to };
  }
  return Object.keys(changes).length ? changes : null;
};

const describeChanges = (changes) => {
  const text = Object.keys(changes).join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} changed`;
};

const listEvents = async (db, contactId) => {
  const events = await db.all(
    // rowid breaks ties between events logged in the same millisecond.
    'SELECT * FROM timeline_events WHERE contactId = ? ORDER BY occurredAt DESC, rowid DESC',
    [contactId],
  );
  return events.map((event) => ({
    ...event,
    changes: event.changes ? JSON.parse(event.changes) : null,
  }));
};

module.exports = { logEvent, diff, describeChanges, listEvents };
