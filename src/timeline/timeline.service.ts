import crypto from 'node:crypto';
import type { Db } from '../db/connection.ts';
import { now } from '../lib/fields.ts';

export type TimelineEventType =
  | 'contact_created' | 'contact_updated'
  | 'social_added' | 'social_updated' | 'social_removed'
  | 'field_added' | 'field_updated' | 'field_removed';
export type TimelineEntityType = 'contact' | 'social' | 'custom_field';
export type Changes = Record<string, { from: unknown; to: unknown }>;

type TimelineEventRow = {
  id: string;
  contactId: string;
  type: TimelineEventType;
  entityType: TimelineEntityType;
  entityId: string | null;
  summary: string;
  changes: string | null;
  occurredAt: string;
};

export const logEvent = (
  db: Db,
  contactId: string,
  type: TimelineEventType,
  entityType: TimelineEntityType,
  entityId: string,
  summary: string,
  changes: Changes | null = null,
) =>
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

export const diff = (
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  fields: readonly string[],
) => {
  const changes: Changes = {};
  for (const field of fields) {
    const from = oldRow[field] ?? null;
    const to = newRow[field] ?? null;
    if (from !== to) changes[field] = { from, to };
  }
  return Object.keys(changes).length ? changes : null;
};

export const describeChanges = (changes: Record<string, unknown>) => {
  const text = Object.keys(changes).join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} changed`;
};

export const listEvents = async (db: Db, contactId: string) => {
  const events = await db.all<TimelineEventRow>(
    // rowid breaks ties between events logged in the same millisecond.
    'SELECT * FROM timeline_events WHERE contactId = ? ORDER BY occurredAt DESC, rowid DESC',
    [contactId],
  );
  return events.map((event) => ({
    ...event,
    changes: event.changes ? (JSON.parse(event.changes) as Changes) : null,
  }));
};
