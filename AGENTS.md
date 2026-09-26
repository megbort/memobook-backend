# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository. `CLAUDE.md` holds the same content; keep them in sync.

## Commands

```bash
npm run dev            # seed empty DB, then node --watch src/server.ts
npm start              # seed empty DB, then node src/server.ts (Railway)
npm run seed           # insert mock contacts if the contacts table is empty
npm run typecheck      # tsc, type checking only
npm test               # Vitest, once
npm run test:watch
npm run test:coverage  # fails below 90% lines/functions/statements, 85% branches
```

CI: `.github/workflows/test.yml` runs `npm run typecheck` and `npm run test:coverage` on every PR commit and on pushes to `master`.

## Architecture

TypeScript (ES modules) + Express 5 + sqlite3 (no ORM), organized by feature under `src/`:

- **`db/connection.ts`**: `createDb(file)` returns `{ run, get, all, exec, close, withTransaction }`. These are promise wrappers around one sqlite3 connection. `withTransaction` queues so transactions never overlap.
- **`db/migrations.ts`**: `migrate(db)` applies pending entries of the append-only `MIGRATIONS` array (tracked in `PRAGMA user_version`), each in a transaction. Never edit a shipped migration; append a new one.
- **`app.ts`**: `createApp(db, { allowedOrigins, logError })` mounts the routers and the error handler. Express 5 forwards async rejections to that handler. Throw `HttpError(status, message)` (in `lib/httpError.ts`) for 4xx.
- **Feature folders** (`contacts/`, `socials/`, `customFields/`, `timeline/`, `media/`):
  - `*.routes.ts` exports `xRouter(db)`; nested ones use `mergeParams` and are mounted at `/contacts/:id/...`.
  - `*.service.ts` holds the DB logic, with functions taking `db` first.
  - `*.validation.ts` holds field whitelists and validators.
- **`lib/fields.ts`**: `emptyToNull` (stores `''` as NULL), `isBlank`, `pickPresent` (partial updates), `now`, `isOneOf` (type guard for allowed values). `RequestBody` is the loose type for untrusted request bodies.

There is no db singleton: `server.ts` creates the connection and passes it in. This is what lets tests use `:memory:`.

TypeScript:
- There is no build step. Node (22.18 or newer) runs the `.ts` files directly by stripping the types, and `tsc` only type checks (`noEmit`). So only erasable syntax is allowed (`erasableSyntaxOnly`): no `enum`, `namespace` or constructor parameter properties.
- Relative imports include the `.ts` extension. Import types with `import type` or an inline `type` (`verbatimModuleSyntax`).
- Row types (`Contact`, `Social`, `CustomField`) live next to their field lists in `*.validation.ts`. `db.get<Row>()` returns `Row | undefined`, and `db.all<Row>()` returns `Row[]`.

Rules:
- Every write to a contact, social or custom field must call `logEvent(db, ...)` inside the same transaction. That log feeds the Timeline.
- `name` is never written by clients. It is rebuilt from `firstName + lastName` (`fullName`), and `firstName` is required.
- PUTs are partial: only keys present in the body change.
- A new or changed endpoint needs the route, the service, tests in `tests/`, the Postman collection (`postman/`) and the README API table.

## Tests

`tests/helpers.ts` provides:
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
