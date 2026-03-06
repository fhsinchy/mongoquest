# MongoQuest

Interactive MongoDB learning platform. Write real `mongosh` queries, get instant validation and feedback, level up through structured challenges.

[![CI](https://github.com/fhsinchy/mongoquest/actions/workflows/ci.yml/badge.svg)](https://github.com/fhsinchy/mongoquest/actions/workflows/ci.yml)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/fhsinchy/mongoquest?quickstart=1)

## How It Works

MongoQuest teaches MongoDB through hands-on practice. Learners write queries in a browser-based editor (powered by Monaco), run them against a real MongoDB instance, and receive structured feedback on what they got right or wrong.

The platform ships with **coursepacks** — collections of themed modules and challenges. Each challenge defines a target query, seeds test data, executes the learner's query, and validates the results.

### Built-in Coursepack: CRUD Essentials

35 challenges across 6 modules (~6 hours):

| Module | Challenges | Topics |
|--------|-----------|--------|
| Reading Documents | 8 | `find`, `findOne`, projection, sort, limit, skip, count |
| Creating Documents | 5 | `insertOne`, `insertMany`, nested docs, flexible schema |
| Updating Documents | 6 | `$set`, `$inc`, `$push`, `$pull`, `updateMany`, multiple operators |
| Deleting Documents | 4 | `deleteOne`, `deleteMany`, filtered deletes, soft delete pattern |
| Query Operators | 7 | `$gt/$lt/$in`, `$regex`, `$exists`, `$and/$or`, nested fields, array queries |
| Capstone | 5 | Real-world scenarios combining all operations |

## Quick Start

### GitHub Codespaces (recommended)

Click the button above. The environment starts automatically with MongoDB, Bun, and the dev server. Port 3000 opens in your browser.

### Docker Compose

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000). The app and MongoDB start together.

### Local Development

**Prerequisites:** [Bun](https://bun.sh) and MongoDB 7.0+

```bash
# Install dependencies
bun install

# Start MongoDB (if not already running)
docker compose up mongo -d

# Start dev server (client + server with hot reload)
bun run dev
```

The client runs on port 5173 (Vite dev server) and the API on port 3000.

## Architecture

```
packages/
  shared/     Mongosh parser, Zod schemas, TypeScript types
  server/     Hono API on Bun — coursepack loading, query execution, validation
  client/     SvelteKit SPA — Monaco editor, challenge UI, progress tracking
coursepacks/
  crud-essentials/    Seed data, module definitions, challenge JSON files
```

### Key Components

**Mongosh Parser** (`packages/shared`) — Parses `db.collection.method()` syntax into a structured query plan. Supports chained calls like `db.orders.find({}).sort({}).limit(5)`. No `eval`, no sandboxing needed.

**Executor** (`packages/server`) — Takes a parsed query plan, runs it against MongoDB, and returns results. Separate read/write database clients enforce access control.

**Validator** (`packages/server`) — Compares the learner's query plan and results against the challenge's expected output. Generates specific feedback like "Expected filter `{status: 'active'}` but got `{}`".

**Progress Store** (`packages/client`) — Tracks completed challenges, XP, and streaks in localStorage. Supports Gist sync for persistence across devices.

## Creating Coursepacks

Coursepacks are directories with a standard structure:

```
coursepacks/my-coursepack/
  coursepack.json          Manifest (id, name, difficulty, modules list)
  seed/
    collection_name.json  Array of documents to seed
  modules/
    01-module-name/
      module.json          Module metadata (id, name, description)
      challenges/
        01-challenge.json  Challenge definition
```

### Challenge Format

```json
{
  "id": "01-find-active",
  "title": "Find Active Orders",
  "description": "Retrieve all orders with status 'active'.",
  "concept": "Explanation of the concept being taught.",
  "hint": "Try db.orders.find({ status: 'active' })",
  "collection": "orders",
  "type": "find",
  "validation": {
    "strategy": "output_match",
    "expected": {
      "filter": { "status": "active" }
    }
  },
  "starterCode": "db.orders.find()",
  "xp": 10
}
```

The `validation.expected` object defines what the correct query should look like. The validator checks both the query structure (filter, sort, projection) and the result set.

## Testing

```bash
# Unit tests
bun test --filter unit

# Integration tests (needs MongoDB)
COURSEPACK_DIR=./coursepacks bun test --filter integration

# E2E tests (needs running app via docker compose)
node packages/client/node_modules/.bin/playwright test --config packages/client/playwright.config.ts
```

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Server:** [Hono](https://hono.dev)
- **Client:** [SvelteKit](https://svelte.dev) (adapter-static)
- **Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Database:** [MongoDB 7.0](https://www.mongodb.com)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com)
- **Linting:** [Biome](https://biomejs.dev)
- **Testing:** Bun test runner + [Playwright](https://playwright.dev)

## License

MIT
