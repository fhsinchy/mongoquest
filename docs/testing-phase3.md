# Phase 3 Frontend Testing

## Prerequisites

- Docker running
- Bun installed
- A coursepack in `coursepacks/` directory

## 1. Start Services

```bash
# Start MongoDB
docker compose up -d

# Build the client
cd packages/client && bun run build && cd ../..

# Start the server (serves API + static frontend)
bun run --filter server dev
```

Open http://localhost:3000

## 2. Welcome Page

- [ ] Page loads with "Master MongoDB One Query at a Time" heading
- [ ] Coursepacks are listed (or empty state shown if none exist)
- [ ] Nav bar shows MongoQuest logo, XP counter (0), no streak badge
- [ ] Clicking a coursepack navigates to `/learn/<id>`

## 3. Coursepack Overview

- [ ] Back link to home works
- [ ] Coursepack name, description, difficulty shown
- [ ] "Seed Database" button works (seeds MongoDB collections)
- [ ] Modules listed with progress bars (all at 0%)
- [ ] Module 1 is unlocked, subsequent modules locked (greyed + lock icon)
- [ ] First challenge in Module 1 is clickable, rest are locked
- [ ] "Continue" link navigates to first available challenge

## 4. Challenge Interface

- [ ] Split-pane layout: sidebar | challenge description | editor + output
- [ ] Sidebar shows all modules/challenges with lock/available/current states
- [ ] Current challenge highlighted with green dot
- [ ] Challenge pane shows title, XP badge, type badge, description, concept
- [ ] "Show hint" toggle reveals/hides hint text

### Monaco Editor

- [ ] Editor loads with starter code
- [ ] Syntax highlighting works (dark theme, green strings, cyan keywords)
- [ ] Typing `db.` triggers collection name autocomplete
- [ ] Typing `db.<collection>.` triggers method autocomplete
- [ ] Ctrl+Enter runs the query
- [ ] "Run" button runs the query

### Query Execution

- [ ] Running a correct query shows green "Correct!" feedback with checkmark
- [ ] Running an incorrect query shows red feedback with X
- [ ] Parse errors show error message in output
- [ ] Result JSON displayed in formatted output panel
- [ ] Loading spinner shown while query executes

### Progression

- [ ] On success: XP counter in nav bar increments
- [ ] On success: streak badge appears (or increments)
- [ ] On success: "Next Challenge" bar appears at bottom
- [ ] On success: sidebar shows green checkmark for completed challenge
- [ ] Clicking "Next Challenge" navigates to next challenge
- [ ] Next challenge in sequence becomes available after completion
- [ ] On failure: editor preserved, can retry immediately

## 5. Progress Persistence

- [ ] Complete a challenge, reload page — challenge still shows as completed
- [ ] XP and streak persist across reloads
- [ ] Open DevTools > Application > Local Storage — `mongoquest_progress` key exists

## 6. Dev Server (alternative)

For hot-reload during development:

```bash
# Terminal 1: API server
bun run --filter server dev

# Terminal 2: SvelteKit dev server (proxies API calls manually or use separate port)
cd packages/client && bun run dev
```

Note: The dev server runs on port 5173. API calls go to `/api/*` which won't reach the server on port 3000 unless you configure a proxy. For full testing, use the production build served from Hono (step 1).

## 7. Unit Tests

```bash
# All tests (shared + server + client)
bun test

# Client progress store only
bun test packages/client/src/lib/stores/__tests__/progress.unit.test.ts
```

Expected: 60 tests pass, 0 fail.
