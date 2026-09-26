# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository. `CLAUDE.md` holds the same content; keep them in sync.

## Commands

```bash
npm run dev            # seed empty DB, then nodemon src/server.js
npm start              # seed empty DB, then node src/server.js (Railway)
npm run seed           # insert mock contacts if the contacts table is empty
npm test               # Vitest, once
npm run test:watch
npm run test:coverage  # fails below 90% lines/functions/statements, 85% branches
```

CI: `.github/workflows/test.yml` runs `npm run test:coverage` on every PR commit and on pushes to `master`.

## Architecture

Express 5 + sqlite3 (no ORM), CommonJS, organized by feature under `src/`:

- **`db/connection.js`**: `createDb(file)` returns `{ run, get, all, exec, close, withTransaction }`. These are promise wrappers around one sqlite3 connection. `withTransaction` queues so transactions never overlap.
- **`db/migrations.js`**: `migrate(db)` applies pending entries of the append-only `MIGRATIONS` array (tracked in `PRAGMA user_version`), each in a transaction. Never edit a shipped migration; append a new one.
- **`app.js`**: `createApp(db, { allowedOrigins, logError })` mounts the routers and the error handler. Express 5 forwards async rejections to that handler. Throw `HttpError(status, message)` (in `lib/httpError.js`) for 4xx.
- **Feature folders** (`contacts/`, `socials/`, `customFields/`, `timeline/`, `media/`):
  - `*.routes.js` exports `xRouter(db)`; nested ones use `mergeParams` and are mounted at `/contacts/:id/...`.
  - `*.service.js` holds the DB logic, with functions taking `db` first.
  - `*.validation.js` holds field whitelists and validators.
- **`lib/fields.js`**: `emptyToNull` (stores `''` as NULL), `isBlank`, `pickPresent` (partial updates), `now`.

There is no db singleton: `server.js` creates the connection and passes it in. This is what lets tests use `:memory:`.

Rules:
- Every write to a contact, social or custom field must call `logEvent(db, ...)` inside the same transaction. That log feeds the Timeline.
- `name` is never written by clients. It is rebuilt from `firstName + lastName` (`fullName`), and `firstName` is required.
- PUTs are partial: only keys present in the body change.
- A new or changed endpoint needs the route, the service, tests in `tests/`, the Postman collection (`postman/`) and the README API table.

## Tests

`tests/helpers.js` provides:
- `makeTestApp()`, which returns `{ db, app, api }` with a fresh migrated in-memory DB (`api` is a supertest agent)
- `createContact(api, overrides)`
- `timelineTypes(api, id)`

Close the db in `afterEach`.

## Environment

- `ALLOWED_ORIGINS` (comma-separated) controls CORS. It defaults to `http://localhost:3001,http://localhost:5173`.
- `PORT` defaults to 3000.
- In production (`NODE_ENV=production`), `DB_PATH` sets the database file. Otherwise the database is `contacts.db` in the project root.

## Code style

- Write self-descriptive code: names of variables, functions, constants and components should say what they are and do. Prefer renaming, or extracting a well-named helper, over adding a comment.
- Comment only where really needed: to explain *why* something non-obvious is done (a constraint, a workaround, a gotcha). Never restate *what* the code does.
- No section-banner or divider comments, no commented-out code.
