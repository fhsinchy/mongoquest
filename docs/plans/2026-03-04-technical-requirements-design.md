# Technical Requirements Document — MongoQuest

**Interactive MongoDB Learning Platform**

| Field   | Value                        |
| ------- | ---------------------------- |
| Author  | Farhan Hasin Chowdhury       |
| Version | 1.0 — MVP                   |
| Date    | March 4, 2026                |
| Status  | Draft                        |
| Companion | [MongoQuest PRD v1.0](../../mongoquest-prd.pdf) |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Mongosh Parser](#2-mongosh-parser)
3. [API Design](#3-api-design)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Database Architecture and Security](#5-database-architecture-and-security)
6. [Validation Engine](#6-validation-engine)
7. [Coursepack Schema Validation](#7-coursepack-schema-validation)
8. [Docker and Infrastructure](#8-docker-and-infrastructure)
9. [Testing Strategy](#9-testing-strategy)
10. [CI/CD](#10-cicd)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Open Questions Resolved](#12-open-questions-resolved)

---

## 1. Purpose and Scope

This TRD is the technical companion to the MongoQuest PRD v1.0. Together they form the source of truth for the MVP. The PRD defines *what* the platform does and *why*; this document defines *how* it is built.

**What this document covers (gaps in the PRD):**

- Mongosh parser design and pipeline
- Complete API endpoint specification
- SvelteKit page routing and component architecture
- MongoDB user provisioning and security implementation
- Collection snapshot/restore mechanism
- Validation engine comparison semantics
- Challenge progression state machine
- Feedback generation logic
- Coursepack schema validation (Zod)
- Gist sync protocol
- Docker multi-stage build and initialization
- Bun workspace configuration
- Testing strategy (unit, integration, E2E)
- CI/CD pipeline (GitHub Actions)
- Error handling across all failure modes

**What this document does not repeat:**

- Stack rationale (see PRD Section 4.1)
- User personas (see PRD Section 3)
- Success metrics (see PRD Section 2.2)
- MVP coursepack content and module breakdown (see PRD Section 6)
- Development phases and timeline (see PRD Section 9)
- Launch strategy (see PRD Section 9.2)

---

## 2. Mongosh Parser

The parser is the most technically complex component in MongoQuest. It translates mongosh shell syntax into MongoDB Node.js driver calls.

### 2.1 Approach

Hand-written recursive descent parser. No `eval`, no regex-based translation. This gives full control over error messages, security, and the exact subset of syntax supported.

### 2.2 Supported Syntax

The parser handles a well-defined subset of mongosh:

```
db.<collection>.<method>(<args>)
db.<collection>.<method>(<args>).<chainedMethod>(<args>)
```

**Supported methods (MVP):**

| Category | Methods |
| -------- | ------- |
| Read | `find`, `findOne`, `countDocuments` |
| Write | `insertOne`, `insertMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany` |
| Chain modifiers | `.sort()`, `.limit()`, `.skip()`, `.projection()` / `.project()` |

### 2.3 Parser Pipeline

```
Input string
    │
    ▼
┌──────────┐
│ Tokenizer │  Splits into tokens: identifiers, dots, parens,
└────┬─────┘  braces, brackets, strings, numbers, booleans,
     │        null, operators ($set, $inc, etc.)
     ▼
┌──────────┐
│  Parser  │  Recursive descent → AST
└────┬─────┘  { collection, method, args, chain }
     │
     ▼
┌────────────┐
│ Translator │  AST → MongoDB Node.js driver calls
└────────────┘
```

**Example translation:**

```
Input:  db.orders.find({ status: "shipped" }).sort({ total: -1 }).limit(5)

AST:    {
          collection: "orders",
          method: "find",
          args: [{ status: "shipped" }],
          chain: [
            { method: "sort", args: [{ total: -1 }] },
            { method: "limit", args: [5] }
          ]
        }

Driver: db.collection("orders")
          .find({ status: "shipped" })
          .sort({ total: -1 })
          .limit(5)
          .toArray()
```

### 2.4 Argument Parsing

Arguments are parsed as JavaScript object/array literals (JSON superset):

- Unquoted keys: `{ status: "shipped" }` (not just `{ "status": "shipped" }`)
- Single-quoted strings: `'shipped'`
- Trailing commas allowed
- Special constructors recognized: `ObjectId()`, `ISODate()`, `NumberInt()`

### 2.5 Error Messages

The parser produces user-friendly error messages that point to the position in the input:

```
Parse error at position 34: Unexpected '}'.
Did you forget a comma between fields?

  db.orders.find({ status: "shipped" total: 5 })
                                     ^
```

### 2.6 Security

- The parser rejects any method not in the allowlist. `dropDatabase`, `createIndex`, `createCollection`, `aggregate` (MVP) and all admin commands are blocked.
- No `eval` or dynamic code execution at any stage.
- Method allowlist is the first line of defense; MongoDB user permissions (Section 5) are the second.

### 2.7 Location

`packages/shared/src/parser/` — shared package so it can be unit tested independently and potentially used by the client for syntax validation in the future.

---

## 3. API Design

### 3.1 Base URL

`http://localhost:3000/api`

All routes are prefixed with `/api`. The root `/` and all non-API paths serve the static SvelteKit frontend.

### 3.2 Coursepack Endpoints

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET` | `/coursepacks` | List all available coursepacks (id, name, description, difficulty) |
| `GET` | `/coursepacks/:id` | Get full coursepack manifest with modules |
| `POST` | `/coursepacks/:id/seed` | Seed/reset the database for this coursepack |

**`GET /coursepacks` response:**

```json
{
  "coursepacks": [
    {
      "id": "crud-essentials",
      "name": "CRUD Essentials",
      "description": "Master MongoDB CRUD from zero to confident",
      "difficulty": "beginner",
      "estimatedHours": 6,
      "moduleCount": 6,
      "challengeCount": 35
    }
  ]
}
```

**`GET /coursepacks/:id` response:**

```json
{
  "id": "crud-essentials",
  "name": "CRUD Essentials",
  "version": "1.0.0",
  "description": "Master MongoDB CRUD from zero to confident",
  "author": "Farhan Hasin Chowdhury",
  "difficulty": "beginner",
  "estimatedHours": 6,
  "modules": [
    {
      "id": "01-reading-documents",
      "name": "Reading Documents",
      "description": "Learn to query MongoDB collections",
      "challenges": [
        { "id": "01-find-all", "title": "Find All Documents", "xp": 10 },
        { "id": "02-find-by-field", "title": "Find Orders by Status", "xp": 10 },
        { "id": "03-projection", "title": "Select Specific Fields", "xp": 10 }
      ]
    }
  ]
}
```

**`POST /coursepacks/:id/seed` response:**

```json
{
  "success": true,
  "database": "mongoquest_crud_essentials",
  "collections": ["customers", "orders", "products"],
  "documentCount": 350
}
```

### 3.3 Challenge Endpoints

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET` | `/coursepacks/:id/modules/:moduleId` | Get module metadata + challenge list |
| `GET` | `/coursepacks/:id/modules/:moduleId/challenges/:challengeId` | Get single challenge details |
| `POST` | `/coursepacks/:id/modules/:moduleId/challenges/:challengeId/run` | Execute learner's query and validate |

**`GET .../challenges/:challengeId` response:**

```json
{
  "id": "find-by-field",
  "title": "Find Orders by Status",
  "description": "Find all orders with status \"shipped\".",
  "concept": "The find() method accepts a filter document...",
  "hint": "Use { status: \"shipped\" } as your filter.",
  "collection": "orders",
  "type": "find",
  "starterCode": "db.orders.find()",
  "xp": 10
}
```

Note: The `validation` field is intentionally excluded from the GET response — learners should not see the expected answer.

**`POST .../challenges/:challengeId/run` request:**

```json
{
  "query": "db.orders.find({ status: 'shipped' })"
}
```

**Success response:**

```json
{
  "success": true,
  "result": [
    { "_id": "...", "status": "shipped", "total": 45.99 }
  ],
  "feedback": "Correct! The find() method with a filter document returns only matching documents. This is the most common way to query MongoDB.",
  "xp": 10
}
```

**Failure response:**

```json
{
  "success": false,
  "result": [
    { "_id": "...", "status": "pending", "total": 12.50 }
  ],
  "feedback": "Your query returned 15 documents, but the expected result has 8. Check your filter condition.",
  "error": null
}
```

**Parse/runtime error response:**

```json
{
  "success": false,
  "result": null,
  "feedback": null,
  "error": "Parse error at position 23: unexpected '{'. Did you forget a comma?"
}
```

### 3.4 Gist Sync Endpoints

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `POST` | `/sync/gist/save` | Save progress to a GitHub Gist |
| `POST` | `/sync/gist/load` | Load progress from a GitHub Gist |

**`POST /sync/gist/save` request:**

```json
{
  "token": "ghp_...",
  "gistId": "abc123...",
  "progress": { "...progress object..." }
}
```

The server proxies the GitHub Gist API. The token is never stored server-side — it lives in `localStorage` on the client.

- If `gistId` is null, the server creates a new private Gist and returns the ID.
- If `gistId` is provided, the server updates the existing Gist.

**`POST /sync/gist/load` request:**

```json
{
  "token": "ghp_...",
  "gistId": "abc123..."
}
```

Returns the progress object stored in the Gist.

### 3.5 Health Endpoint

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET` | `/health` | Health check |

**Response:**

```json
{
  "status": "ok",
  "mongo": "connected",
  "coursepacks": 1,
  "uptime": 12345
}
```

### 3.6 Middleware Stack

Applied in order to all `/api` routes:

1. **Logger** — Hono built-in request logger
2. **Error handler** — Global catch-all returning consistent error JSON `{ error: { code, message, details? } }`
3. **CORS** — Allow `localhost` origins (for development with SvelteKit dev server)
4. **Request timeout** — 10s global timeout; query execution uses 5s `maxTimeMS`

---

## 4. Frontend Architecture

### 4.1 Adapter

`adapter-static` — SvelteKit pre-renders to static HTML/JS/CSS at build time. The output is served by Hono as static files. All data fetching happens client-side via the API.

### 4.2 Page Routes

| Route | Component | Purpose |
| ----- | --------- | ------- |
| `/` | `+page.svelte` | Welcome screen, coursepack selector |
| `/learn/[coursepackId]` | `+page.svelte` | Coursepack overview: module list, progress summary |
| `/learn/[coursepackId]/[moduleId]/[challengeId]` | `+page.svelte` | Main challenge interface (split-pane) |

### 4.3 Layouts

| Layout | Responsibility |
| ------ | -------------- |
| `+layout.svelte` (root) | Nav bar: logo, XP counter, streak display, settings gear |
| `/learn/+layout.svelte` | Learning layout with collapsible sidebar for module/challenge navigation |

### 4.4 Key Components

| Component | Responsibility |
| --------- | -------------- |
| `ChallengePane.svelte` | Left panel: title, description, concept explanation, expandable hint |
| `EditorPane.svelte` | Right panel: Monaco editor, run button, output display |
| `MonacoEditor.svelte` | Wraps Monaco with mongosh syntax highlighting and basic autocompletion |
| `OutputDisplay.svelte` | Raw query result (formatted JSON), pass/fail indicator, feedback message |
| `ProgressBar.svelte` | Module completion percentage bar |
| `ModuleSidebar.svelte` | Collapsible sidebar showing modules and challenges with state (locked/available/completed) |
| `GistSyncSettings.svelte` | Settings modal for GitHub PAT input and sync controls |
| `Toast.svelte` | Non-blocking notification for sync errors and other transient messages |

### 4.5 State Management

**Progress store** (`progressStore.ts`) — Svelte writable store backed by `localStorage`.

```ts
interface ProgressState {
  coursepacks: {
    [coursepackId: string]: {
      modules: {
        [moduleId: string]: {
          challenges: {
            [challengeId: string]: {
              completed: boolean
              completedAt: string  // ISO 8601
            }
          }
        }
      }
    }
  }
  totalXp: number
  streak: {
    current: number
    lastActiveDate: string  // YYYY-MM-DD
  }
}
```

**Streak logic:**

- On challenge completion, check `lastActiveDate`
- If today: no change to streak counter
- If yesterday: increment streak by 1
- If older: reset streak to 1
- Update `lastActiveDate` to today

### 4.6 Challenge Progression

**Sequential within module, modules unlocked linearly.**

```
Module 1: Challenge 1 → Challenge 2 → ... → Challenge N
                                                    │
                                                    ▼ (all completed)
Module 2: Challenge 1 → Challenge 2 → ... → Challenge N
                                                    │
                                                    ▼
Module 3: ...
```

Rules:

- Within a module, challenges must be completed in order
- A module unlocks when all challenges in the previous module are completed
- Module 1 is always unlocked
- Learners can revisit any completed challenge (re-run queries, re-read concepts)
- Revisiting a completed challenge does not grant additional XP

**UI states for challenges in the sidebar:**

| State | Visual | Interaction |
| ----- | ------ | ----------- |
| Locked | Grey, lock icon | Click shows "Complete previous challenges to unlock" |
| Available | White/default, no icon | Click navigates to challenge |
| Completed | Green, checkmark icon | Click navigates (revisit mode) |
| Current | Highlighted, dot indicator | Currently active challenge |

### 4.7 Gist Sync

**Auto-sync on challenge completion, debounced.**

Flow:

1. Learner completes a challenge → progress store updates → `localStorage` updated immediately
2. A 2-second debounce timer starts (resets if another challenge is completed quickly)
3. After debounce: `POST /api/sync/gist/save` with the full progress object
4. On app load: if GitHub PAT exists in `localStorage`, `POST /api/sync/gist/load` and merge with local state
5. **Merge strategy:** Per-challenge, latest `completedAt` timestamp wins. Total XP is recalculated from the merged challenge state. Streak is recalculated from challenge completion dates.

**Error handling:** Sync failures show a non-blocking toast. Local state is always authoritative — Gist is a backup, not the source of truth.

### 4.8 Monaco Configuration

| Setting | Value |
| ------- | ----- |
| Language | `javascript` (closest available mode to mongosh) |
| Theme | Custom dark theme matching the app design |
| Minimap | Disabled |
| Line numbers | Enabled |
| Font size | 14px |
| Word wrap | On |
| Scrollbar | Minimal |
| Tab size | 2 |

**Custom autocompletion provider:**

- `db.` triggers collection name suggestions (fetched from the coursepack manifest)
- `db.<collection>.` triggers method suggestions with signatures
- Method signatures show parameter hints (e.g., `find(filter?, projection?)`)

---

## 5. Database Architecture and Security

### 5.1 Database Naming

Each coursepack gets its own database:

```
mongoquest_<coursepackId>
```

Example: `mongoquest_crud_essentials`

This prevents coursepacks from interfering with each other when multiple are installed.

### 5.2 MongoDB User Provisioning

Two users created via `mongo-init.js` (mounted as `docker-entrypoint-initdb.d/init.js`):

| User | Password | Roles | Purpose |
| ---- | -------- | ----- | ------- |
| `mongoquest_readonly` | `mongoquest` | `read` role on all DBs | Read-only challenges |
| `mongoquest_writer` | `mongoquest` | `readWrite` role on all DBs | Write challenges |

Note: Passwords are not secrets — this runs entirely locally via Docker. The purpose of separate users is defense-in-depth against accidental data mutation, not access control.

**`mongo-init.js`:**

```js
db.createUser({
  user: "mongoquest_readonly",
  pwd: "mongoquest",
  roles: [{ role: "read", db: "admin" }]
})

db.createUser({
  user: "mongoquest_writer",
  pwd: "mongoquest",
  roles: [{ role: "readWrite", db: "admin" }]
})
```

### 5.3 Connection Management

Two `MongoClient` instances in the Hono server:

| Client | User | Used When |
| ------ | ---- | --------- |
| `readClient` | `mongoquest_readonly` | Challenge type is `find`, `findOne`, or `countDocuments` |
| `writeClient` | `mongoquest_writer` | Challenge type is `insertOne`, `insertMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany` |

Both clients:

- Pool size: default (5 connections — sufficient for local single-user)
- Lazy initialization: connect on first request, not on server startup
- Shared across requests (singleton pattern in the Hono app)

### 5.4 Collection Snapshot and Restore

For write challenges, the database must be in a known state before the learner's query runs.

**Mechanism: drop and re-seed.**

```
Before each write challenge attempt:
1. Drop the target collection (specified in challenge config)
2. Bulk insert seed data from coursepack's seed/ directory
3. Execute the learner's query
4. Run validation against the resulting collection state
```

**Performance:** The seed data is cached in memory when the coursepack is loaded. Metro Mart has ~350 documents across 3 collections. A drop + bulk insert of 200 documents takes <50ms — imperceptible to the learner.

**For read challenges:** No snapshot/restore needed. The read-only user cannot mutate data.

### 5.5 Query Execution Sandbox

Defense in depth — multiple layers prevent destructive operations:

| Layer | Mechanism |
| ----- | --------- |
| 1. Parser | Rejects methods not in the allowlist |
| 2. MongoDB user | Read-only user for read challenges; `readWrite` for write challenges |
| 3. Timeout | `maxTimeMS: 5000` on all driver operations |
| 4. Snapshot/restore | Even if data is corrupted, next attempt re-seeds |

**Execution flow:**

```
Learner's query string
    │
    ▼
Parser (allowlist check) ──── blocked? → return error
    │
    ▼
Select MongoClient (read or write based on challenge type)
    │
    ▼
Translate AST to driver call
    │
    ▼
Execute with maxTimeMS: 5000 ──── timeout? → return timeout error
    │
    ▼
Return result to validation engine
```

---

## 6. Validation Engine

### 6.1 Validation Flow

```
1. Snapshot collection state (if write challenge — see Section 5.4)
2. Parse learner's query via mongosh parser
3. Execute query against MongoDB
4. Run the challenge's configured validation strategy
5. Generate feedback message
6. Return result to the API response
```

### 6.2 Strategy: `output_match`

Runs the learner's query and compares the result set against running the expected query from the challenge config.

**Comparison rules:**

| Rule | Default | Configurable |
| ---- | ------- | ------------ |
| Order sensitivity | Order-insensitive | `validation.orderSensitive: true` for `.sort()` challenges |
| `_id` comparison | Excluded | `validation.compareIds: true` if needed |
| Deep equality | Exact match on field values and types | — |
| Field order | Ignored (within documents) | — |
| Subset mode | Disabled (exact set match) | `validation.subset: true` for projection challenges |

**Comparison algorithm:**

1. Execute learner's query → `actualResult[]`
2. Execute expected query (from `validation.expected`) → `expectedResult[]`
3. Strip `_id` from both (unless `compareIds: true`)
4. If `orderSensitive`:
   - Compare arrays element-by-element with deep equality
5. Else:
   - Sort both arrays by a deterministic key (stringify and sort)
   - Compare sorted arrays element-by-element
6. If `subset: true`:
   - Check that every document in `expectedResult` exists in `actualResult`
   - Extra documents in `actualResult` are acceptable

### 6.3 Strategy: `document_check`

After executing the learner's query, inspects the collection state using a list of checks.

**Check types:**

```ts
type DocumentCheck =
  | { type: "count"; collection: string; filter: object; expected: number }
  | { type: "exists"; collection: string; filter: object }
  | { type: "notExists"; collection: string; filter: object }
  | { type: "fieldEquals"; collection: string; filter: object; field: string; expected: any }
```

**Example challenge config:**

```json
{
  "validation": {
    "strategy": "document_check",
    "checks": [
      { "type": "count", "collection": "orders", "filter": { "status": "shipped" }, "expected": 5 },
      { "type": "exists", "collection": "orders", "filter": { "customerId": "C001", "status": "cancelled" } },
      { "type": "notExists", "collection": "orders", "filter": { "_id": "ORDER-042" } },
      { "type": "fieldEquals", "collection": "products", "filter": { "name": "Milk" }, "field": "price", "expected": 3.99 }
    ]
  }
}
```

All checks must pass for the challenge to be marked correct. On failure, the first failing check determines the feedback message.

### 6.4 Strategy: `custom_validator`

The coursepack provides a TypeScript file exporting a validator function:

```ts
// coursepacks/my-pack/validators/my-validator.ts
import type { Db } from "mongodb"
import type { ChallengeConfig } from "@mongoquest/shared"

export default async function validate(
  result: any,
  db: Db,
  challenge: ChallengeConfig
): Promise<{ passed: boolean; feedback: string }>
```

The platform dynamically imports and executes this function. The validator receives the learner's query result, a database handle for further inspection, and the challenge configuration.

Not used in the MVP CRUD Essentials coursepack, but the engine supports it from day one to avoid schema changes later.

### 6.5 Feedback Generation

**On success:**

Return the challenge's `concept` field as reinforcement, prefixed with "Why this works:".

**On failure (by mismatch type):**

| Mismatch | Feedback |
| -------- | -------- |
| Wrong document count | `"Your query returned X documents, expected Y."` |
| Missing filter (returned everything) | `"Your query returned all documents. Did you add a filter?"` |
| Wrong fields in projection | `"Your result includes the 'email' field, but the challenge asks you to exclude it."` |
| Order mismatch (on sort challenges) | `"The documents are correct but in the wrong order. Check your .sort() direction."` |
| Document not inserted | `"The expected document was not found in the collection after your query ran."` |
| Document not deleted | `"The document still exists. Check your filter in deleteOne()."` |
| Field not updated | `"The 'price' field is still 4.99, expected 3.99. Check your $set operator."` |

**On error:**

| Error Type | Feedback |
| ---------- | -------- |
| Parse error | `"Parse error at position N: <description>"` with caret |
| Query timeout | `"Your query took too long (>5s). Check for missing filters or infinite conditions."` |
| MongoDB runtime error | Pass through MongoDB message, e.g., `"unknown operator: $sett (did you mean $set?)"` |
| Method not allowed | `"The method 'dropCollection' is not allowed in challenges."` |

---

## 7. Coursepack Schema Validation

All coursepack JSON files are validated at load time using Zod schemas. The schemas live in `packages/shared/src/schemas/`.

### 7.1 Coursepack Manifest Schema

```ts
import { z } from "zod"

const CoursepackManifest = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be valid semver"),
  description: z.string().max(500),
  author: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedHours: z.number().positive(),
  minMongoVersion: z.string().optional().default("7.0"),
  database: z.object({
    name: z.string().regex(/^[a-z_]+$/, "Must be lowercase with underscores"),
    seedDir: z.string(),
  }),
  modules: z.array(z.string()).min(1),
})
```

### 7.2 Module Schema

```ts
const ModuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string(),
  challenges: z.array(z.string()).min(1),
})
```

### 7.3 Challenge Schema

```ts
const ValidationOutputMatch = z.object({
  strategy: z.literal("output_match"),
  expected: z.object({
    filter: z.record(z.any()).optional(),
    sort: z.record(z.number()).optional(),
    limit: z.number().optional(),
    skip: z.number().optional(),
    projection: z.record(z.number()).optional(),
  }),
  orderSensitive: z.boolean().optional().default(false),
  compareIds: z.boolean().optional().default(false),
  subset: z.boolean().optional().default(false),
})

const DocumentCheckItem = z.discriminatedUnion("type", [
  z.object({ type: z.literal("count"), collection: z.string(), filter: z.record(z.any()), expected: z.number() }),
  z.object({ type: z.literal("exists"), collection: z.string(), filter: z.record(z.any()) }),
  z.object({ type: z.literal("notExists"), collection: z.string(), filter: z.record(z.any()) }),
  z.object({ type: z.literal("fieldEquals"), collection: z.string(), filter: z.record(z.any()), field: z.string(), expected: z.any() }),
])

const ValidationDocumentCheck = z.object({
  strategy: z.literal("document_check"),
  checks: z.array(DocumentCheckItem).min(1),
})

const ValidationCustom = z.object({
  strategy: z.literal("custom_validator"),
  validatorFile: z.string(),
})

const ValidationSchema = z.discriminatedUnion("strategy", [
  ValidationOutputMatch,
  ValidationDocumentCheck,
  ValidationCustom,
])

const ChallengeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(150),
  description: z.string(),
  concept: z.string(),
  hint: z.string(),
  collection: z.string(),
  type: z.enum([
    "find", "findOne", "countDocuments",
    "insertOne", "insertMany",
    "updateOne", "updateMany",
    "deleteOne", "deleteMany",
  ]),
  validation: ValidationSchema,
  starterCode: z.string(),
  xp: z.number().int().positive(),
})
```

### 7.4 Error Reporting for Coursepack Authors

On validation failure at load time:

```
[ERROR] Invalid coursepack: crud-essentials
  File: modules/01-reading-documents/challenges/03-projection.json
  Path: validation.expected.filter
  Error: Required field missing

The coursepack "CRUD Essentials" was not loaded.
Fix the errors above and restart the server.
```

Errors are:

- Logged to the server console with color-coded output
- The invalid coursepack is excluded from `GET /coursepacks` (the platform continues to function with valid coursepacks)
- No runtime crashes — graceful degradation

---

## 8. Docker and Infrastructure

### 8.1 Docker Compose

Two services:

| Service | Image | Ports | Depends On |
| ------- | ----- | ----- | ---------- |
| `app` | Built from `Dockerfile` | `3000:3000` | `mongo` (healthy) |
| `mongo` | `mongo:7.0` | `27017:27017` | — |

**Key configuration:**

```yaml
services:
  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: mongoquest
    volumes:
      - mongo-data:/data/db
      - ./docker/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      MONGO_URI: mongodb://admin:mongoquest@mongo:27017
      COURSEPACK_DIR: /app/coursepacks
    volumes:
      - ./coursepacks:/app/coursepacks:ro
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongo-data:
```

### 8.2 Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN bun install --frozen-lockfile

# Stage 2: Build client (SvelteKit static) + compile server
FROM deps AS build
COPY . .
RUN bun run build

# Stage 3: Runtime
FROM oven/bun:1-slim AS runtime
WORKDIR /app
COPY --from=build /app/packages/server/dist ./server/
COPY --from=build /app/packages/client/build ./client/
COPY --from=build /app/packages/shared/dist ./shared/
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "server/index.js"]
```

**Target image size:** <150MB

### 8.3 Environment Variables

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `MONGO_URI` | `mongodb://admin:mongoquest@mongo:27017` | MongoDB connection string |
| `MONGO_READONLY_USER` | `mongoquest_readonly` | Read-only MongoDB user |
| `MONGO_WRITER_USER` | `mongoquest_writer` | Write MongoDB user |
| `MONGO_PASSWORD` | `mongoquest` | Shared password (local only) |
| `PORT` | `3000` | Hono server port |
| `COURSEPACK_DIR` | `./coursepacks` | Path to coursepacks directory |
| `NODE_ENV` | `production` | Environment flag |

### 8.4 Bun Workspace

Root `package.json`:

```json
{
  "name": "mongoquest",
  "private": true,
  "workspaces": ["packages/*"]
}
```

| Package | Description | Dependencies |
| ------- | ----------- | ------------ |
| `packages/shared` | TypeScript types, Zod schemas, mongosh parser | `zod` |
| `packages/server` | Hono API server, validation engine, MongoDB connection | `hono`, `mongodb`, `@mongoquest/shared` |
| `packages/client` | SvelteKit frontend | `svelte`, `@sveltejs/kit`, `monaco-editor`, `@mongoquest/shared` |

Cross-package imports use Bun's native workspace linking:

```ts
// In packages/server/src/validator.ts
import { ChallengeSchema } from "@mongoquest/shared"
```

---

## 9. Testing Strategy

### 9.1 Tier 1: Unit Tests

Runner: `bun test`

| Area | What's Tested | Location |
| ---- | ------------- | -------- |
| Mongosh tokenizer | All token types, edge cases (nested braces, special chars) | `packages/shared/src/parser/__tests__/` |
| Mongosh parser | AST generation for all supported methods and chain modifiers | `packages/shared/src/parser/__tests__/` |
| Mongosh translator | AST-to-driver-call translation correctness | `packages/shared/src/parser/__tests__/` |
| Validation: output_match | Order-sensitive/insensitive, `_id` exclusion, subset mode, deep equality | `packages/server/src/validation/__tests__/` |
| Validation: document_check | All check types (count, exists, notExists, fieldEquals) | `packages/server/src/validation/__tests__/` |
| Coursepack schemas | Zod validation: valid JSON accepted, invalid JSON rejected with correct error paths | `packages/shared/src/schemas/__tests__/` |
| Feedback generator | Correct messages for each mismatch type | `packages/server/src/feedback/__tests__/` |
| Progress store | XP calculation, streak logic, merge strategy | `packages/client/src/stores/__tests__/` |

### 9.2 Tier 2: Integration Tests

Runner: `bun test` with a real MongoDB instance (service container in CI, local Docker in dev)

| Area | What's Tested |
| ---- | ------------- |
| API: `GET /coursepacks` | Returns loaded coursepacks, excludes invalid ones |
| API: `POST .../seed` | Seeds database, returns correct counts |
| API: `POST .../run` (success) | Full pipeline: parse → execute → validate → success response |
| API: `POST .../run` (failure) | Wrong query returns failure with meaningful feedback |
| API: `POST .../run` (error) | Parse errors, timeouts, permission denied |
| Seed/restore | Drop + re-seed cycle restores exact state |
| Security: read-only | Read-only client rejects write operations |
| Security: parser | Blocked methods return appropriate errors |
| Gist sync | Save and load round-trip (mock GitHub API) |

**Test database:** `mongoquest_test` — dropped and recreated before each test suite.

### 9.3 Tier 3: E2E Tests

Runner: Playwright

| Flow | What's Tested |
| ---- | ------------- |
| Onboarding | Welcome screen loads → pick coursepack → first challenge appears |
| Challenge success | Write correct query → run → pass indicator + feedback → next challenge unlocks |
| Challenge failure | Write wrong query → run → fail indicator + meaningful feedback → can retry |
| Parse error | Write invalid syntax → run → error message with position |
| Progress persistence | Complete challenges → refresh browser → progress retained |
| Module unlock | Complete all challenges in Module 1 → Module 2 becomes available |
| Hint system | Click hint → hint expands → hint text matches challenge config |
| Revisit completed | Navigate to completed challenge → can re-run but no XP granted |

**Infrastructure:** Playwright tests run against a full `docker compose up` stack.

### 9.4 Test Commands

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test --filter unit",
    "test:integration": "bun test --filter integration",
    "test:e2e": "bunx playwright test",
    "test:all": "bun test && bunx playwright test"
  }
}
```

---

## 10. CI/CD

### 10.1 CI Pipeline (GitHub Actions)

**Trigger:** Every PR and push to `main`.

```
ci.yml
  ├── lint-and-typecheck (parallel)
  │   ├── bun install
  │   ├── bun run lint          (Biome)
  │   └── bun run typecheck     (tsc --noEmit)
  │
  ├── unit-tests (parallel)
  │   ├── bun install
  │   └── bun test --filter unit
  │
  ├── integration-tests (parallel)
  │   ├── Service: mongo:7.0
  │   ├── bun install
  │   └── bun test --filter integration
  │
  └── e2e-tests (sequential, after all above pass)
      ├── docker compose up -d
      ├── Wait for health check (curl /api/health)
      ├── bunx playwright test
      └── docker compose down
```

**Linting:** Biome — fast, single-tool replacement for ESLint + Prettier, designed for the Bun/TypeScript ecosystem.

### 10.2 Release Pipeline

**Trigger:** Tag push matching `v*` (e.g., `v1.0.0`).

```
release.yml
  1. Run full CI (lint + typecheck + all tests)
  2. Build Docker image
  3. Create GitHub Release with auto-generated changelog
  4. Push Docker image to GHCR (ghcr.io/fhsinchy/mongoquest)
```

---

## 11. Error Handling Strategy

### 11.1 Error Response Format

All API errors return a consistent JSON shape:

```ts
interface ApiError {
  error: {
    code: string       // machine-readable: "PARSE_ERROR", "TIMEOUT", "MONGO_ERROR", etc.
    message: string    // human-readable description
    details?: any      // optional structured data (e.g., parse position, Zod errors)
  }
}
```

### 11.2 Error Scenarios

| Scenario | HTTP Status | Code | User-Facing Behavior |
| -------- | ----------- | ---- | -------------------- |
| MongoDB unreachable | 503 | `MONGO_UNAVAILABLE` | Health check fails. Welcome screen: "MongoDB is not running. Make sure Docker is up." with troubleshooting link |
| Invalid coursepack JSON | — | — | Coursepack not listed in API. Server logs Zod error with file path and field |
| Coursepack not found | 404 | `COURSEPACK_NOT_FOUND` | "Coursepack 'X' not found" |
| Challenge not found | 404 | `CHALLENGE_NOT_FOUND` | "Challenge 'X' not found in module 'Y'" |
| Mongosh parse error | 400 | `PARSE_ERROR` | Red banner under editor with error message and caret position |
| Query timeout (>5s) | 408 | `QUERY_TIMEOUT` | "Your query took too long. Check for missing filters or infinite conditions." |
| MongoDB runtime error | 400 | `MONGO_ERROR` | Pass through MongoDB error message (e.g., "unknown operator: $sett") |
| Method not allowed (parser) | 400 | `METHOD_NOT_ALLOWED` | "The method 'dropCollection' is not allowed in challenges." |
| Write to wrong collection | 403 | `PERMISSION_DENIED` | "Permission denied: this challenge only allows writes to the 'orders' collection." |
| Gist sync failure | 502 | `GIST_SYNC_ERROR` | Toast: "Could not sync to GitHub. Your progress is saved locally." |
| Invalid Gist token | 401 | `GIST_AUTH_ERROR` | "GitHub token is invalid or expired. Check your settings." |
| Empty query submitted | 400 | `EMPTY_QUERY` | "Please enter a MongoDB query before clicking Run." |

### 11.3 Frontend Error Display

| Error Type | Display |
| ---------- | ------- |
| Parse/validation errors | Inline under the editor in a red error panel |
| Network errors | Full-width banner at top of the page |
| Sync errors | Non-blocking toast notification (bottom-right, auto-dismiss 5s) |
| MongoDB down | Overlay on welcome screen with troubleshooting steps |

---

## 12. Open Questions Resolved

The PRD listed three open questions. Here are the TRD's resolutions:

| # | PRD Question | Resolution |
| - | ------------ | ---------- |
| 1 | Best approach for parsing mongosh syntax? | **Custom hand-written recursive descent parser.** Handles the exact subset needed, produces great error messages, no `eval` or external dependencies. See Section 2. |
| 2 | Should Gist sync be push-only or automatic? | **Automatic on challenge completion, debounced (2s).** Seamless UX. Failures are non-blocking toasts. Local state is always authoritative. See Section 4.7. |
| 3 | Should coursepacks declare a minimum MongoDB version? | **Yes, `minMongoVersion` field in coursepack.json manifest.** Defaults to `"7.0"`. Platform checks at load time and warns if incompatible. See Section 7.1. |
