# MongoQuest Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build MongoQuest — an interactive, locally-runnable MongoDB learning platform with a custom mongosh parser, validation engine, and coursepack system.

**Architecture:** Bun monorepo with three packages (shared, server, client). Hono serves the API and static SvelteKit frontend. Docker Compose orchestrates the app + MongoDB 7.0. Coursepacks are self-contained JSON directories validated by Zod schemas.

**Tech Stack:** Bun, TypeScript, Hono, SvelteKit (adapter-static), MongoDB 7.0, Monaco Editor, Tailwind CSS, Zod, Docker Compose, Biome, Playwright

**Reference docs:** `docs/plans/2026-03-04-technical-requirements-design.md` (TRD) and `mongoquest-prd.pdf` (PRD)

---

## Phase 1: Foundation

### Task 1: Project Scaffolding — Root Monorepo

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `.gitignore`

**Step 1: Initialize Bun workspace root**

```bash
bun init -y
```

**Step 2: Write root `package.json`**

```json
{
  "name": "mongoquest",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "typecheck": "bun run --filter '*' typecheck",
    "test": "bun test",
    "test:unit": "bun test --filter unit",
    "test:integration": "bun test --filter integration",
    "test:e2e": "bunx playwright test"
  }
}
```

**Step 3: Write root `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

**Step 4: Write `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "semicolons": "asNeeded" }
  }
}
```

**Step 5: Write `.gitignore`**

```
node_modules/
dist/
build/
.svelte-kit/
.env
*.local
.DS_Store
```

**Step 6: Install root dev dependencies**

```bash
bun add -d @biomejs/biome typescript
```

**Step 7: Commit**

```bash
git add package.json tsconfig.json biome.json .gitignore bun.lock
git commit -m "feat: initialize monorepo with Bun workspaces, Biome, TypeScript"
```

---

### Task 2: Shared Package Scaffold

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

**Step 1: Create shared package structure**

```bash
mkdir -p packages/shared/src
```

**Step 2: Write `packages/shared/package.json`**

```json
{
  "name": "@mongoquest/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  }
}
```

**Step 3: Write `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 4: Write `packages/shared/src/index.ts`**

```ts
export {}
```

**Step 5: Install shared dependencies**

```bash
cd packages/shared && bun add zod && cd ../..
```

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat: scaffold shared package with Zod"
```

---

### Task 3: Coursepack Zod Schemas

**Files:**
- Create: `packages/shared/src/schemas/coursepack.ts`
- Create: `packages/shared/src/schemas/module.ts`
- Create: `packages/shared/src/schemas/challenge.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Test: `packages/shared/src/schemas/__tests__/schemas.unit.test.ts`

**Step 1: Write failing tests for coursepack schemas**

Create `packages/shared/src/schemas/__tests__/schemas.unit.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import {
  CoursepackManifestSchema,
  ModuleSchema,
  ChallengeSchema,
} from "../index"

describe("CoursepackManifestSchema", () => {
  const validManifest = {
    id: "crud-essentials",
    name: "CRUD Essentials",
    version: "1.0.0",
    description: "Master MongoDB CRUD from zero to confident",
    author: "Farhan Hasin Chowdhury",
    difficulty: "beginner",
    estimatedHours: 6,
    database: { name: "local_business", seedDir: "./seed" },
    modules: ["01-reading-documents"],
  }

  it("accepts a valid manifest", () => {
    const result = CoursepackManifestSchema.safeParse(validManifest)
    expect(result.success).toBe(true)
  })

  it("defaults minMongoVersion to 7.0", () => {
    const result = CoursepackManifestSchema.parse(validManifest)
    expect(result.minMongoVersion).toBe("7.0")
  })

  it("rejects invalid id format", () => {
    const result = CoursepackManifestSchema.safeParse({
      ...validManifest,
      id: "Invalid ID!",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-semver version", () => {
    const result = CoursepackManifestSchema.safeParse({
      ...validManifest,
      version: "1.0",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty modules array", () => {
    const result = CoursepackManifestSchema.safeParse({
      ...validManifest,
      modules: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("ModuleSchema", () => {
  it("accepts a valid module", () => {
    const result = ModuleSchema.safeParse({
      id: "01-reading-documents",
      name: "Reading Documents",
      description: "Learn to query MongoDB",
      challenges: ["01-find-all"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty challenges", () => {
    const result = ModuleSchema.safeParse({
      id: "01-reading-documents",
      name: "Reading Documents",
      description: "Learn to query MongoDB",
      challenges: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("ChallengeSchema", () => {
  it("accepts a valid output_match challenge", () => {
    const result = ChallengeSchema.safeParse({
      id: "find-by-field",
      title: "Find Orders by Status",
      description: 'Find all orders with status "shipped".',
      concept: "The find() method accepts a filter document...",
      hint: 'Use { status: "shipped" } as your filter.',
      collection: "orders",
      type: "find",
      validation: {
        strategy: "output_match",
        expected: { filter: { status: "shipped" } },
      },
      starterCode: "db.orders.find()",
      xp: 10,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a valid document_check challenge", () => {
    const result = ChallengeSchema.safeParse({
      id: "insert-one",
      title: "Insert a Product",
      description: "Insert a new product.",
      concept: "insertOne() adds a single document...",
      hint: "Use db.products.insertOne({...})",
      collection: "products",
      type: "insertOne",
      validation: {
        strategy: "document_check",
        checks: [
          { type: "exists", collection: "products", filter: { name: "Test" } },
        ],
      },
      starterCode: "db.products.insertOne()",
      xp: 15,
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid challenge type", () => {
    const result = ChallengeSchema.safeParse({
      id: "bad",
      title: "Bad",
      description: "Bad",
      concept: "Bad",
      hint: "Bad",
      collection: "orders",
      type: "aggregate",
      validation: { strategy: "output_match", expected: {} },
      starterCode: "",
      xp: 10,
    })
    expect(result.success).toBe(false)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test packages/shared/src/schemas/__tests__/schemas.unit.test.ts
```
Expected: FAIL — modules not found

**Step 3: Implement schemas**

Create `packages/shared/src/schemas/coursepack.ts`:

```ts
import { z } from "zod"

export const CoursepackManifestSchema = z.object({
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

export type CoursepackManifest = z.infer<typeof CoursepackManifestSchema>
```

Create `packages/shared/src/schemas/module.ts`:

```ts
import { z } from "zod"

export const ModuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string(),
  challenges: z.array(z.string()).min(1),
})

export type Module = z.infer<typeof ModuleSchema>
```

Create `packages/shared/src/schemas/challenge.ts`:

```ts
import { z } from "zod"

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
  z.object({
    type: z.literal("count"),
    collection: z.string(),
    filter: z.record(z.any()),
    expected: z.number(),
  }),
  z.object({
    type: z.literal("exists"),
    collection: z.string(),
    filter: z.record(z.any()),
  }),
  z.object({
    type: z.literal("notExists"),
    collection: z.string(),
    filter: z.record(z.any()),
  }),
  z.object({
    type: z.literal("fieldEquals"),
    collection: z.string(),
    filter: z.record(z.any()),
    field: z.string(),
    expected: z.any(),
  }),
])

const ValidationDocumentCheck = z.object({
  strategy: z.literal("document_check"),
  checks: z.array(DocumentCheckItem).min(1),
})

const ValidationCustom = z.object({
  strategy: z.literal("custom_validator"),
  validatorFile: z.string(),
})

export const ValidationSchema = z.discriminatedUnion("strategy", [
  ValidationOutputMatch,
  ValidationDocumentCheck,
  ValidationCustom,
])

export const CHALLENGE_TYPES = [
  "find", "findOne", "countDocuments",
  "insertOne", "insertMany",
  "updateOne", "updateMany",
  "deleteOne", "deleteMany",
] as const

export const ChallengeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(150),
  description: z.string(),
  concept: z.string(),
  hint: z.string(),
  collection: z.string(),
  type: z.enum(CHALLENGE_TYPES),
  validation: ValidationSchema,
  starterCode: z.string(),
  xp: z.number().int().positive(),
})

export type Challenge = z.infer<typeof ChallengeSchema>
export type ValidationConfig = z.infer<typeof ValidationSchema>
export type ChallengeType = (typeof CHALLENGE_TYPES)[number]
```

Create `packages/shared/src/schemas/index.ts`:

```ts
export {
  CoursepackManifestSchema,
  type CoursepackManifest,
} from "./coursepack"
export { ModuleSchema, type Module } from "./module"
export {
  ChallengeSchema,
  ValidationSchema,
  CHALLENGE_TYPES,
  type Challenge,
  type ValidationConfig,
  type ChallengeType,
} from "./challenge"
```

Update `packages/shared/src/index.ts`:

```ts
export * from "./schemas/index"
```

**Step 4: Run tests to verify they pass**

```bash
bun test packages/shared/src/schemas/__tests__/schemas.unit.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/shared/src/
git commit -m "feat: add Zod schemas for coursepack, module, and challenge"
```

---

### Task 4: Mongosh Parser — Tokenizer

**Files:**
- Create: `packages/shared/src/parser/types.ts`
- Create: `packages/shared/src/parser/tokenizer.ts`
- Test: `packages/shared/src/parser/__tests__/tokenizer.unit.test.ts`

**Step 1: Write types**

Create `packages/shared/src/parser/types.ts`:

```ts
export type TokenType =
  | "IDENTIFIER"
  | "DOT"
  | "LPAREN"
  | "RPAREN"
  | "LBRACE"
  | "RBRACE"
  | "LBRACKET"
  | "RBRACKET"
  | "COLON"
  | "COMMA"
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "NULL"
  | "MINUS"
  | "EOF"

export interface Token {
  type: TokenType
  value: string
  position: number
}

export interface MongoshAST {
  collection: string
  method: string
  args: unknown[]
  chain: ChainedCall[]
}

export interface ChainedCall {
  method: string
  args: unknown[]
}

export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
    public input: string,
  ) {
    super(message)
    this.name = "ParseError"
  }

  toUserMessage(): string {
    const line = this.input
    const pointer = " ".repeat(this.position) + "^"
    return `${this.message}\n\n  ${line}\n  ${pointer}`
  }
}
```

**Step 2: Write failing tokenizer tests**

Create `packages/shared/src/parser/__tests__/tokenizer.unit.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { tokenize } from "../tokenizer"

describe("tokenizer", () => {
  it("tokenizes a simple find query", () => {
    const tokens = tokenize('db.orders.find({ status: "shipped" })')
    const types = tokens.map((t) => t.type)
    expect(types).toEqual([
      "IDENTIFIER", "DOT", "IDENTIFIER", "DOT", "IDENTIFIER",
      "LPAREN", "LBRACE", "IDENTIFIER", "COLON", "STRING", "RBRACE", "RPAREN",
      "EOF",
    ])
  })

  it("tokenizes numbers including negatives", () => {
    const tokens = tokenize("db.orders.find().sort({ total: -1 })")
    const numToken = tokens.find((t) => t.type === "NUMBER")
    expect(numToken).toBeDefined()
    expect(numToken!.value).toBe("-1")
  })

  it("tokenizes boolean and null values", () => {
    const tokens = tokenize("db.col.find({ active: true, deleted: null })")
    expect(tokens.some((t) => t.type === "BOOLEAN" && t.value === "true")).toBe(true)
    expect(tokens.some((t) => t.type === "NULL")).toBe(true)
  })

  it("tokenizes single-quoted strings", () => {
    const tokens = tokenize("db.col.find({ name: 'test' })")
    const str = tokens.find((t) => t.type === "STRING")
    expect(str).toBeDefined()
    expect(str!.value).toBe("test")
  })

  it("tokenizes $operators as identifiers", () => {
    const tokens = tokenize('db.col.updateOne({ _id: 1 }, { $set: { name: "new" } })')
    const dollarToken = tokens.find((t) => t.value === "$set")
    expect(dollarToken).toBeDefined()
    expect(dollarToken!.type).toBe("IDENTIFIER")
  })

  it("tokenizes arrays", () => {
    const tokens = tokenize("db.col.insertOne({ tags: [1, 2, 3] })")
    expect(tokens.some((t) => t.type === "LBRACKET")).toBe(true)
    expect(tokens.some((t) => t.type === "RBRACKET")).toBe(true)
  })

  it("throws ParseError on unexpected character", () => {
    expect(() => tokenize("db.col.find(~)")).toThrow()
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
bun test packages/shared/src/parser/__tests__/tokenizer.unit.test.ts
```
Expected: FAIL — module not found

**Step 4: Implement tokenizer**

Create `packages/shared/src/parser/tokenizer.ts`:

```ts
import { type Token, type TokenType, ParseError } from "./types"

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++
      continue
    }

    const char = input[i]

    // Single-char tokens
    const singleCharTokens: Record<string, TokenType> = {
      ".": "DOT",
      "(": "LPAREN",
      ")": "RPAREN",
      "{": "LBRACE",
      "}": "RBRACE",
      "[": "LBRACKET",
      "]": "RBRACKET",
      ":": "COLON",
      ",": "COMMA",
    }

    if (char in singleCharTokens) {
      tokens.push({ type: singleCharTokens[char], value: char, position: i })
      i++
      continue
    }

    // Strings (double or single quoted)
    if (char === '"' || char === "'") {
      const quote = char
      const start = i
      i++ // skip opening quote
      let value = ""
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\") {
          i++ // skip backslash
          if (i < input.length) {
            value += input[i]
          }
        } else {
          value += input[i]
        }
        i++
      }
      if (i >= input.length) {
        throw new ParseError(`Unterminated string starting at position ${start}`, start, input)
      }
      i++ // skip closing quote
      tokens.push({ type: "STRING", value, position: start })
      continue
    }

    // Numbers (including negative: only after colon, comma, lparen, lbracket)
    if (
      /[0-9]/.test(char) ||
      (char === "-" && i + 1 < input.length && /[0-9]/.test(input[i + 1]) && canBeNegativeNumber(tokens))
    ) {
      const start = i
      if (char === "-") i++
      while (i < input.length && /[0-9.]/.test(input[i])) {
        i++
      }
      tokens.push({ type: "NUMBER", value: input.slice(start, i), position: start })
      continue
    }

    // Identifiers (including $-prefixed operators and _-prefixed fields)
    if (/[a-zA-Z_$]/.test(char)) {
      const start = i
      while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
        i++
      }
      const value = input.slice(start, i)

      if (value === "true" || value === "false") {
        tokens.push({ type: "BOOLEAN", value, position: start })
      } else if (value === "null") {
        tokens.push({ type: "NULL", value, position: start })
      } else {
        tokens.push({ type: "IDENTIFIER", value, position: start })
      }
      continue
    }

    throw new ParseError(
      `Unexpected character '${char}' at position ${i}`,
      i,
      input,
    )
  }

  tokens.push({ type: "EOF", value: "", position: i })
  return tokens
}

function canBeNegativeNumber(tokens: Token[]): boolean {
  if (tokens.length === 0) return true
  const last = tokens[tokens.length - 1]
  return ["COLON", "COMMA", "LPAREN", "LBRACKET"].includes(last.type)
}
```

**Step 5: Run tests to verify they pass**

```bash
bun test packages/shared/src/parser/__tests__/tokenizer.unit.test.ts
```
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/shared/src/parser/
git commit -m "feat: add mongosh tokenizer with full token type support"
```

---

### Task 5: Mongosh Parser — AST Parser

**Files:**
- Create: `packages/shared/src/parser/parser.ts`
- Test: `packages/shared/src/parser/__tests__/parser.unit.test.ts`

**Step 1: Write failing parser tests**

Create `packages/shared/src/parser/__tests__/parser.unit.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { parse } from "../parser"
import { ParseError } from "../types"

describe("parser", () => {
  it("parses db.collection.find()", () => {
    const ast = parse("db.orders.find()")
    expect(ast.collection).toBe("orders")
    expect(ast.method).toBe("find")
    expect(ast.args).toEqual([])
    expect(ast.chain).toEqual([])
  })

  it("parses find with filter argument", () => {
    const ast = parse('db.orders.find({ status: "shipped" })')
    expect(ast.collection).toBe("orders")
    expect(ast.method).toBe("find")
    expect(ast.args).toEqual([{ status: "shipped" }])
  })

  it("parses chained methods", () => {
    const ast = parse("db.orders.find({}).sort({ total: -1 }).limit(5)")
    expect(ast.method).toBe("find")
    expect(ast.chain).toEqual([
      { method: "sort", args: [{ total: -1 }] },
      { method: "limit", args: [5] },
    ])
  })

  it("parses nested objects", () => {
    const ast = parse('db.col.updateOne({ _id: 1 }, { $set: { name: "new" } })')
    expect(ast.method).toBe("updateOne")
    expect(ast.args).toEqual([{ _id: 1 }, { $set: { name: "new" } }])
  })

  it("parses arrays", () => {
    const ast = parse('db.col.insertMany([{ a: 1 }, { a: 2 }])')
    expect(ast.method).toBe("insertMany")
    expect(ast.args).toEqual([[{ a: 1 }, { a: 2 }]])
  })

  it("parses findOne", () => {
    const ast = parse('db.customers.findOne({ email: "test@test.com" })')
    expect(ast.method).toBe("findOne")
    expect(ast.collection).toBe("customers")
  })

  it("parses countDocuments", () => {
    const ast = parse("db.orders.countDocuments({ status: 'pending' })")
    expect(ast.method).toBe("countDocuments")
  })

  it("rejects queries not starting with db.", () => {
    expect(() => parse("orders.find()")).toThrow(ParseError)
  })

  it("rejects disallowed methods", () => {
    expect(() => parse("db.col.dropDatabase()")).toThrow(ParseError)
  })

  it("rejects disallowed methods like aggregate", () => {
    expect(() => parse("db.col.aggregate([])")).toThrow(ParseError)
  })

  it("handles trailing commas in objects", () => {
    const ast = parse('db.col.find({ status: "a", })')
    expect(ast.args).toEqual([{ status: "a" }])
  })

  it("handles boolean and null values", () => {
    const ast = parse("db.col.find({ active: true, deleted: null })")
    expect(ast.args).toEqual([{ active: true, deleted: null }])
  })

  it("parses skip chain", () => {
    const ast = parse("db.col.find({}).skip(10).limit(5)")
    expect(ast.chain).toEqual([
      { method: "skip", args: [10] },
      { method: "limit", args: [5] },
    ])
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test packages/shared/src/parser/__tests__/parser.unit.test.ts
```
Expected: FAIL

**Step 3: Implement parser**

Create `packages/shared/src/parser/parser.ts`:

```ts
import { tokenize } from "./tokenizer"
import { type Token, type MongoshAST, type ChainedCall, ParseError } from "./types"

const ALLOWED_METHODS = new Set([
  "find", "findOne", "countDocuments",
  "insertOne", "insertMany",
  "updateOne", "updateMany",
  "deleteOne", "deleteMany",
])

const ALLOWED_CHAIN_METHODS = new Set([
  "sort", "limit", "skip", "projection", "project",
])

export function parse(input: string): MongoshAST {
  const tokens = tokenize(input)
  let pos = 0

  function current(): Token {
    return tokens[pos]
  }

  function expect(type: Token["type"], value?: string): Token {
    const tok = current()
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new ParseError(
        `Expected ${value ? `'${value}'` : type} but got '${tok.value}'`,
        tok.position,
        input,
      )
    }
    pos++
    return tok
  }

  function parseValue(): unknown {
    const tok = current()

    if (tok.type === "STRING") {
      pos++
      return tok.value
    }

    if (tok.type === "NUMBER") {
      pos++
      return tok.value.includes(".") ? parseFloat(tok.value) : parseInt(tok.value, 10)
    }

    if (tok.type === "BOOLEAN") {
      pos++
      return tok.value === "true"
    }

    if (tok.type === "NULL") {
      pos++
      return null
    }

    if (tok.type === "LBRACE") {
      return parseObject()
    }

    if (tok.type === "LBRACKET") {
      return parseArray()
    }

    // Handle special constructors like ObjectId("..."), ISODate("...")
    if (tok.type === "IDENTIFIER" && ["ObjectId", "ISODate", "NumberInt"].includes(tok.value)) {
      const constructorName = tok.value
      pos++
      expect("LPAREN")
      let arg: unknown = undefined
      if (current().type !== "RPAREN") {
        arg = parseValue()
      }
      expect("RPAREN")
      return { $constructor: constructorName, value: arg }
    }

    throw new ParseError(
      `Unexpected token '${tok.value}' at position ${tok.position}`,
      tok.position,
      input,
    )
  }

  function parseObject(): Record<string, unknown> {
    expect("LBRACE")
    const obj: Record<string, unknown> = {}

    while (current().type !== "RBRACE") {
      // Key: identifier or string
      let key: string
      if (current().type === "IDENTIFIER") {
        key = current().value
        pos++
      } else if (current().type === "STRING") {
        key = current().value
        pos++
      } else {
        throw new ParseError(
          `Expected object key but got '${current().value}'`,
          current().position,
          input,
        )
      }

      expect("COLON")
      obj[key] = parseValue()

      // Optional comma (trailing comma allowed)
      if (current().type === "COMMA") {
        pos++
      }
    }

    expect("RBRACE")
    return obj
  }

  function parseArray(): unknown[] {
    expect("LBRACKET")
    const arr: unknown[] = []

    while (current().type !== "RBRACKET") {
      arr.push(parseValue())
      if (current().type === "COMMA") {
        pos++
      }
    }

    expect("RBRACKET")
    return arr
  }

  function parseArgs(): unknown[] {
    expect("LPAREN")
    const args: unknown[] = []

    while (current().type !== "RPAREN") {
      args.push(parseValue())
      if (current().type === "COMMA") {
        pos++
      }
    }

    expect("RPAREN")
    return args
  }

  // Parse: db.<collection>.<method>(<args>)
  expect("IDENTIFIER", "db")
  expect("DOT")
  const collection = expect("IDENTIFIER").value
  expect("DOT")
  const method = expect("IDENTIFIER").value

  if (!ALLOWED_METHODS.has(method)) {
    throw new ParseError(
      `The method '${method}' is not allowed in challenges. Allowed: ${[...ALLOWED_METHODS].join(", ")}`,
      tokens[pos - 1].position,
      input,
    )
  }

  const args = parseArgs()

  // Parse chained methods
  const chain: ChainedCall[] = []
  while (current().type === "DOT") {
    pos++ // skip dot
    const chainMethod = expect("IDENTIFIER").value
    if (!ALLOWED_CHAIN_METHODS.has(chainMethod)) {
      throw new ParseError(
        `The chain method '${chainMethod}' is not allowed. Allowed: ${[...ALLOWED_CHAIN_METHODS].join(", ")}`,
        tokens[pos - 1].position,
        input,
      )
    }
    const chainArgs = parseArgs()
    chain.push({ method: chainMethod, args: chainArgs })
  }

  return { collection, method, args, chain }
}
```

**Step 4: Run tests to verify they pass**

```bash
bun test packages/shared/src/parser/__tests__/parser.unit.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/shared/src/parser/
git commit -m "feat: add recursive descent mongosh parser with method allowlist"
```

---

### Task 6: Mongosh Parser — Translator

**Files:**
- Create: `packages/shared/src/parser/translator.ts`
- Create: `packages/shared/src/parser/index.ts`
- Test: `packages/shared/src/parser/__tests__/translator.unit.test.ts`

**Step 1: Write failing translator tests**

Create `packages/shared/src/parser/__tests__/translator.unit.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { translate } from "../translator"
import type { MongoshAST } from "../types"

describe("translator", () => {
  it("translates find to a query plan", () => {
    const ast: MongoshAST = {
      collection: "orders",
      method: "find",
      args: [{ status: "shipped" }],
      chain: [],
    }
    const plan = translate(ast)
    expect(plan.collection).toBe("orders")
    expect(plan.operation).toBe("find")
    expect(plan.filter).toEqual({ status: "shipped" })
    expect(plan.options).toEqual({})
  })

  it("translates find with sort/limit chain", () => {
    const ast: MongoshAST = {
      collection: "orders",
      method: "find",
      args: [{ status: "shipped" }],
      chain: [
        { method: "sort", args: [{ total: -1 }] },
        { method: "limit", args: [5] },
      ],
    }
    const plan = translate(ast)
    expect(plan.options.sort).toEqual({ total: -1 })
    expect(plan.options.limit).toBe(5)
  })

  it("translates insertOne", () => {
    const ast: MongoshAST = {
      collection: "products",
      method: "insertOne",
      args: [{ name: "Milk", price: 3.99 }],
      chain: [],
    }
    const plan = translate(ast)
    expect(plan.operation).toBe("insertOne")
    expect(plan.document).toEqual({ name: "Milk", price: 3.99 })
  })

  it("translates updateOne", () => {
    const ast: MongoshAST = {
      collection: "orders",
      method: "updateOne",
      args: [{ _id: 1 }, { $set: { status: "shipped" } }],
      chain: [],
    }
    const plan = translate(ast)
    expect(plan.operation).toBe("updateOne")
    expect(plan.filter).toEqual({ _id: 1 })
    expect(plan.update).toEqual({ $set: { status: "shipped" } })
  })

  it("translates deleteOne", () => {
    const ast: MongoshAST = {
      collection: "orders",
      method: "deleteOne",
      args: [{ _id: 1 }],
      chain: [],
    }
    const plan = translate(ast)
    expect(plan.operation).toBe("deleteOne")
    expect(plan.filter).toEqual({ _id: 1 })
  })

  it("translates countDocuments", () => {
    const ast: MongoshAST = {
      collection: "orders",
      method: "countDocuments",
      args: [{ status: "pending" }],
      chain: [],
    }
    const plan = translate(ast)
    expect(plan.operation).toBe("countDocuments")
    expect(plan.filter).toEqual({ status: "pending" })
  })

  it("translates find with skip", () => {
    const ast: MongoshAST = {
      collection: "col",
      method: "find",
      args: [{}],
      chain: [{ method: "skip", args: [10] }, { method: "limit", args: [5] }],
    }
    const plan = translate(ast)
    expect(plan.options.skip).toBe(10)
    expect(plan.options.limit).toBe(5)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test packages/shared/src/parser/__tests__/translator.unit.test.ts
```
Expected: FAIL

**Step 3: Implement translator**

Create `packages/shared/src/parser/translator.ts`:

```ts
import type { MongoshAST } from "./types"

export interface QueryPlan {
  collection: string
  operation: string
  filter?: Record<string, unknown>
  document?: unknown
  documents?: unknown[]
  update?: Record<string, unknown>
  options: {
    sort?: Record<string, number>
    limit?: number
    skip?: number
    projection?: Record<string, number>
  }
}

export function translate(ast: MongoshAST): QueryPlan {
  const plan: QueryPlan = {
    collection: ast.collection,
    operation: ast.method,
    options: {},
  }

  switch (ast.method) {
    case "find":
    case "findOne":
    case "countDocuments":
      plan.filter = (ast.args[0] as Record<string, unknown>) ?? {}
      if (ast.args[1]) {
        plan.options.projection = ast.args[1] as Record<string, number>
      }
      break

    case "insertOne":
      plan.document = ast.args[0]
      break

    case "insertMany":
      plan.documents = ast.args[0] as unknown[]
      break

    case "updateOne":
    case "updateMany":
      plan.filter = (ast.args[0] as Record<string, unknown>) ?? {}
      plan.update = (ast.args[1] as Record<string, unknown>) ?? {}
      break

    case "deleteOne":
    case "deleteMany":
      plan.filter = (ast.args[0] as Record<string, unknown>) ?? {}
      break
  }

  // Apply chain modifiers
  for (const chain of ast.chain) {
    switch (chain.method) {
      case "sort":
        plan.options.sort = chain.args[0] as Record<string, number>
        break
      case "limit":
        plan.options.limit = chain.args[0] as number
        break
      case "skip":
        plan.options.skip = chain.args[0] as number
        break
      case "projection":
      case "project":
        plan.options.projection = chain.args[0] as Record<string, number>
        break
    }
  }

  return plan
}
```

Create `packages/shared/src/parser/index.ts`:

```ts
export { tokenize } from "./tokenizer"
export { parse } from "./parser"
export { translate, type QueryPlan } from "./translator"
export { ParseError, type MongoshAST, type Token, type TokenType, type ChainedCall } from "./types"
```

Update `packages/shared/src/index.ts`:

```ts
export * from "./schemas/index"
export * from "./parser/index"
```

**Step 4: Run tests to verify they pass**

```bash
bun test packages/shared/src/parser/__tests__/translator.unit.test.ts
```
Expected: ALL PASS

**Step 5: Run all shared tests**

```bash
bun test packages/shared/
```
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat: add mongosh translator (AST to query plan) and export parser module"
```

---

### Task 7: Docker Compose + MongoDB Init

**Files:**
- Create: `docker-compose.yml`
- Create: `docker/mongo-init.js`

**Step 1: Create docker directory**

```bash
mkdir -p docker
```

**Step 2: Write `docker/mongo-init.js`**

```js
db = db.getSiblingDB("admin")

db.createUser({
  user: "mongoquest_readonly",
  pwd: "mongoquest",
  roles: [{ role: "readAnyDatabase", db: "admin" }],
})

db.createUser({
  user: "mongoquest_writer",
  pwd: "mongoquest",
  roles: [{ role: "readWriteAnyDatabase", db: "admin" }],
})

print("MongoQuest users created successfully")
```

**Step 3: Write `docker-compose.yml`**

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
      test: ["CMD", "mongosh", "-u", "admin", "-p", "mongoquest", "--authenticationDatabase", "admin", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  mongo-data:
```

**Step 4: Test MongoDB starts**

```bash
docker compose up -d mongo
docker compose ps
```
Expected: mongo service is healthy

**Step 5: Verify users were created**

```bash
docker compose exec mongo mongosh -u admin -p mongoquest --authenticationDatabase admin --eval "db.getSiblingDB('admin').getUsers()"
```
Expected: Output shows `mongoquest_readonly` and `mongoquest_writer` users

**Step 6: Commit**

```bash
git add docker-compose.yml docker/
git commit -m "feat: add Docker Compose with MongoDB 7.0 and user provisioning"
```

---

### Task 8: Server Package Scaffold + MongoDB Connection

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/db.ts`

**Step 1: Create server package structure**

```bash
mkdir -p packages/server/src
```

**Step 2: Write `packages/server/package.json`**

```json
{
  "name": "@mongoquest/server",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  }
}
```

**Step 3: Write `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 4: Install server dependencies**

```bash
cd packages/server && bun add hono mongodb @mongoquest/shared && cd ../..
```

**Step 5: Write `packages/server/src/db.ts`**

```ts
import { MongoClient, type Db } from "mongodb"

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://admin:mongoquest@localhost:27017"
const READONLY_USER = process.env.MONGO_READONLY_USER ?? "mongoquest_readonly"
const WRITER_USER = process.env.MONGO_WRITER_USER ?? "mongoquest_writer"
const PASSWORD = process.env.MONGO_PASSWORD ?? "mongoquest"

let readClient: MongoClient | null = null
let writeClient: MongoClient | null = null

function buildUri(user: string, password: string): string {
  const url = new URL(MONGO_URI)
  url.username = user
  url.password = password
  return url.toString()
}

export async function getReadClient(): Promise<MongoClient> {
  if (!readClient) {
    readClient = new MongoClient(buildUri(READONLY_USER, PASSWORD))
    await readClient.connect()
  }
  return readClient
}

export async function getWriteClient(): Promise<MongoClient> {
  if (!writeClient) {
    writeClient = new MongoClient(buildUri(WRITER_USER, PASSWORD))
    await writeClient.connect()
  }
  return writeClient
}

export async function getDb(dbName: string, writable = false): Promise<Db> {
  const client = writable ? await getWriteClient() : await getReadClient()
  return client.db(dbName)
}

export async function checkConnection(): Promise<boolean> {
  try {
    const client = await getReadClient()
    await client.db("admin").command({ ping: 1 })
    return true
  } catch {
    return false
  }
}

export async function closeConnections(): Promise<void> {
  await readClient?.close()
  await writeClient?.close()
  readClient = null
  writeClient = null
}
```

**Step 6: Write `packages/server/src/index.ts`**

```ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { checkConnection } from "./db"

const app = new Hono()

// Middleware
app.use("*", logger())
app.use("/api/*", cors())

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err)
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    500,
  )
})

// Health check
app.get("/api/health", async (c) => {
  const mongoConnected = await checkConnection()
  return c.json({
    status: mongoConnected ? "ok" : "degraded",
    mongo: mongoConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
  })
})

const port = parseInt(process.env.PORT ?? "3000", 10)

export default {
  port,
  fetch: app.fetch,
}

export { app }
```

**Step 7: Test server starts (requires MongoDB running)**

```bash
cd packages/server && bun run src/index.ts &
sleep 2
curl http://localhost:3000/api/health
kill %1
```
Expected: JSON with `"status": "ok"` and `"mongo": "connected"`

**Step 8: Commit**

```bash
git add packages/server/
git commit -m "feat: scaffold Hono server with MongoDB connection and health endpoint"
```

---

### Task 9: Coursepack Loader

**Files:**
- Create: `packages/server/src/coursepack-loader.ts`
- Create: `coursepacks/crud-essentials/coursepack.json`
- Create: `coursepacks/crud-essentials/seed/customers.json` (minimal test data)
- Create: `coursepacks/crud-essentials/seed/products.json` (minimal test data)
- Create: `coursepacks/crud-essentials/seed/orders.json` (minimal test data)
- Create: `coursepacks/crud-essentials/modules/01-reading-documents/module.json`
- Create: `coursepacks/crud-essentials/modules/01-reading-documents/challenges/01-find-all.json`

**Step 1: Create minimal coursepack test data**

Create `coursepacks/crud-essentials/coursepack.json`:

```json
{
  "id": "crud-essentials",
  "name": "CRUD Essentials",
  "version": "1.0.0",
  "description": "Master MongoDB CRUD from zero to confident",
  "author": "Farhan Hasin Chowdhury",
  "difficulty": "beginner",
  "estimatedHours": 6,
  "database": {
    "name": "local_business",
    "seedDir": "./seed"
  },
  "modules": [
    "01-reading-documents"
  ]
}
```

Create `coursepacks/crud-essentials/seed/customers.json`:

```json
[
  { "name": "Alice Johnson", "email": "alice@example.com", "phone": "555-0101", "loyaltyTier": "gold", "memberSince": "2023-01-15" },
  { "name": "Bob Smith", "email": "bob@example.com", "phone": "555-0102", "loyaltyTier": "silver", "memberSince": "2023-06-20" },
  { "name": "Carol Davis", "email": "carol@example.com", "phone": "555-0103", "loyaltyTier": "bronze", "memberSince": "2024-02-10" }
]
```

Create `coursepacks/crud-essentials/seed/products.json`:

```json
[
  { "name": "Organic Milk", "category": "dairy", "price": 4.99, "stock": 50, "supplier": "Local Farm", "tags": ["organic", "dairy"] },
  { "name": "Whole Wheat Bread", "category": "bakery", "price": 3.49, "stock": 30, "supplier": "City Bakery", "tags": ["whole-grain", "bakery"] },
  { "name": "Free Range Eggs", "category": "dairy", "price": 5.99, "stock": 40, "supplier": "Local Farm", "tags": ["organic", "free-range"] }
]
```

Create `coursepacks/crud-essentials/seed/orders.json`:

```json
[
  { "customerId": "alice", "items": [{ "product": "Organic Milk", "qty": 2, "price": 4.99 }], "total": 9.98, "status": "shipped", "orderDate": "2024-12-01" },
  { "customerId": "bob", "items": [{ "product": "Whole Wheat Bread", "qty": 1, "price": 3.49 }], "total": 3.49, "status": "pending", "orderDate": "2024-12-15" },
  { "customerId": "alice", "items": [{ "product": "Free Range Eggs", "qty": 1, "price": 5.99 }], "total": 5.99, "status": "shipped", "orderDate": "2024-12-20" }
]
```

Create `coursepacks/crud-essentials/modules/01-reading-documents/module.json`:

```json
{
  "id": "01-reading-documents",
  "name": "Reading Documents",
  "description": "Learn to query MongoDB collections using find, findOne, filters, projections, and sorting.",
  "challenges": [
    "01-find-all"
  ]
}
```

Create `coursepacks/crud-essentials/modules/01-reading-documents/challenges/01-find-all.json`:

```json
{
  "id": "01-find-all",
  "title": "Find All Customers",
  "description": "Retrieve all documents from the customers collection.",
  "concept": "The find() method without any arguments returns all documents in a collection. This is the simplest MongoDB query and the foundation for everything else.",
  "hint": "Call find() with no arguments: db.customers.find()",
  "collection": "customers",
  "type": "find",
  "validation": {
    "strategy": "output_match",
    "expected": {
      "filter": {}
    }
  },
  "starterCode": "db.customers.find()",
  "xp": 10
}
```

**Step 2: Write coursepack loader**

Create `packages/server/src/coursepack-loader.ts`:

```ts
import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import {
  CoursepackManifestSchema,
  ModuleSchema,
  ChallengeSchema,
  type CoursepackManifest,
  type Module,
  type Challenge,
} from "@mongoquest/shared"

export interface LoadedCoursepack {
  manifest: CoursepackManifest
  modules: LoadedModule[]
  seedData: Map<string, unknown[]>
  basePath: string
}

export interface LoadedModule {
  meta: Module
  challenges: Challenge[]
}

const COURSEPACK_DIR = process.env.COURSEPACK_DIR ?? resolve(process.cwd(), "../../coursepacks")

export async function loadAllCoursepacks(): Promise<Map<string, LoadedCoursepack>> {
  const coursepacks = new Map<string, LoadedCoursepack>()
  const dir = resolve(COURSEPACK_DIR)

  let entries: string[]
  try {
    entries = await readdir(dir).then((e) => e.filter((name) => !name.startsWith(".")))
  } catch {
    console.warn(`[coursepack-loader] Coursepacks directory not found: ${dir}`)
    return coursepacks
  }

  for (const entry of entries) {
    const packPath = join(dir, entry)
    try {
      const loaded = await loadCoursepack(packPath)
      coursepacks.set(loaded.manifest.id, loaded)
      console.log(`[coursepack-loader] Loaded: ${loaded.manifest.name} (${loaded.manifest.id})`)
    } catch (err) {
      console.error(`[coursepack-loader] Failed to load ${entry}:`, err)
    }
  }

  return coursepacks
}

async function loadCoursepack(basePath: string): Promise<LoadedCoursepack> {
  // Load and validate manifest
  const manifestRaw = await readFile(join(basePath, "coursepack.json"), "utf-8")
  const manifest = CoursepackManifestSchema.parse(JSON.parse(manifestRaw))

  // Load seed data
  const seedData = new Map<string, unknown[]>()
  const seedDir = join(basePath, manifest.database.seedDir)
  try {
    const seedFiles = await readdir(seedDir)
    for (const file of seedFiles) {
      if (!file.endsWith(".json")) continue
      const collectionName = file.replace(".json", "")
      const data = JSON.parse(await readFile(join(seedDir, file), "utf-8"))
      seedData.set(collectionName, data)
    }
  } catch {
    console.warn(`[coursepack-loader] No seed directory found at ${seedDir}`)
  }

  // Load modules
  const modules: LoadedModule[] = []
  for (const moduleId of manifest.modules) {
    const modulePath = join(basePath, "modules", moduleId)
    const moduleRaw = await readFile(join(modulePath, "module.json"), "utf-8")
    const meta = ModuleSchema.parse(JSON.parse(moduleRaw))

    // Load challenges
    const challenges: Challenge[] = []
    for (const challengeId of meta.challenges) {
      const challengePath = join(modulePath, "challenges", `${challengeId}.json`)
      const challengeRaw = await readFile(challengePath, "utf-8")
      const challenge = ChallengeSchema.parse(JSON.parse(challengeRaw))
      challenges.push(challenge)
    }

    modules.push({ meta, challenges })
  }

  return { manifest, modules, seedData, basePath }
}
```

**Step 3: Commit**

```bash
git add packages/server/src/coursepack-loader.ts coursepacks/
git commit -m "feat: add coursepack loader with Zod validation and minimal CRUD Essentials data"
```

---

### Task 10: Database Seeder

**Files:**
- Create: `packages/server/src/seeder.ts`

**Step 1: Implement seeder**

Create `packages/server/src/seeder.ts`:

```ts
import type { Db } from "mongodb"
import { getDb } from "./db"
import type { LoadedCoursepack } from "./coursepack-loader"

export async function seedCoursepack(
  coursepack: LoadedCoursepack,
): Promise<{ database: string; collections: string[]; documentCount: number }> {
  const dbName = `mongoquest_${coursepack.manifest.id.replace(/-/g, "_")}`
  const db = await getDb(dbName, true)

  let totalDocs = 0
  const collections: string[] = []

  for (const [collectionName, documents] of coursepack.seedData) {
    const collection = db.collection(collectionName)
    await collection.drop().catch(() => {}) // ignore if doesn't exist
    if (documents.length > 0) {
      await collection.insertMany(documents as any[])
      totalDocs += documents.length
    }
    collections.push(collectionName)
  }

  return { database: dbName, collections, documentCount: totalDocs }
}

export async function resetCollection(
  dbName: string,
  collectionName: string,
  seedData: unknown[],
): Promise<void> {
  const db = await getDb(dbName, true)
  const collection = db.collection(collectionName)
  await collection.drop().catch(() => {})
  if (seedData.length > 0) {
    await collection.insertMany(seedData as any[])
  }
}
```

**Step 2: Commit**

```bash
git add packages/server/src/seeder.ts
git commit -m "feat: add database seeder with collection reset support"
```

---

### Task 11: API Routes — Coursepacks + Challenges

**Files:**
- Create: `packages/server/src/routes/coursepacks.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Write coursepack routes**

Create `packages/server/src/routes/coursepacks.ts`:

```ts
import { Hono } from "hono"
import type { LoadedCoursepack } from "../coursepack-loader"
import { seedCoursepack } from "../seeder"

export function createCoursepackRoutes(coursepacks: Map<string, LoadedCoursepack>) {
  const router = new Hono()

  // List all coursepacks
  router.get("/", (c) => {
    const list = [...coursepacks.values()].map((cp) => ({
      id: cp.manifest.id,
      name: cp.manifest.name,
      description: cp.manifest.description,
      difficulty: cp.manifest.difficulty,
      estimatedHours: cp.manifest.estimatedHours,
      moduleCount: cp.modules.length,
      challengeCount: cp.modules.reduce((sum, m) => sum + m.challenges.length, 0),
    }))
    return c.json({ coursepacks: list })
  })

  // Get single coursepack with modules
  router.get("/:id", (c) => {
    const cp = coursepacks.get(c.req.param("id"))
    if (!cp) {
      return c.json({ error: { code: "COURSEPACK_NOT_FOUND", message: `Coursepack '${c.req.param("id")}' not found` } }, 404)
    }
    return c.json({
      ...cp.manifest,
      modules: cp.modules.map((m) => ({
        id: m.meta.id,
        name: m.meta.name,
        description: m.meta.description,
        challenges: m.challenges.map((ch) => ({ id: ch.id, title: ch.title, xp: ch.xp })),
      })),
    })
  })

  // Seed coursepack database
  router.post("/:id/seed", async (c) => {
    const cp = coursepacks.get(c.req.param("id"))
    if (!cp) {
      return c.json({ error: { code: "COURSEPACK_NOT_FOUND", message: `Coursepack '${c.req.param("id")}' not found` } }, 404)
    }
    const result = await seedCoursepack(cp)
    return c.json({ success: true, ...result })
  })

  // Get module
  router.get("/:id/modules/:moduleId", (c) => {
    const cp = coursepacks.get(c.req.param("id"))
    if (!cp) {
      return c.json({ error: { code: "COURSEPACK_NOT_FOUND", message: `Coursepack '${c.req.param("id")}' not found` } }, 404)
    }
    const mod = cp.modules.find((m) => m.meta.id === c.req.param("moduleId"))
    if (!mod) {
      return c.json({ error: { code: "MODULE_NOT_FOUND", message: `Module '${c.req.param("moduleId")}' not found` } }, 404)
    }
    return c.json({
      ...mod.meta,
      challenges: mod.challenges.map((ch) => ({ id: ch.id, title: ch.title, xp: ch.xp })),
    })
  })

  // Get challenge (excludes validation)
  router.get("/:id/modules/:moduleId/challenges/:challengeId", (c) => {
    const cp = coursepacks.get(c.req.param("id"))
    if (!cp) {
      return c.json({ error: { code: "COURSEPACK_NOT_FOUND", message: `Coursepack '${c.req.param("id")}' not found` } }, 404)
    }
    const mod = cp.modules.find((m) => m.meta.id === c.req.param("moduleId"))
    if (!mod) {
      return c.json({ error: { code: "MODULE_NOT_FOUND", message: `Module '${c.req.param("moduleId")}' not found` } }, 404)
    }
    const challenge = mod.challenges.find((ch) => ch.id === c.req.param("challengeId"))
    if (!challenge) {
      return c.json({ error: { code: "CHALLENGE_NOT_FOUND", message: `Challenge '${c.req.param("challengeId")}' not found` } }, 404)
    }
    // Exclude validation from response
    const { validation, ...publicChallenge } = challenge
    return c.json(publicChallenge)
  })

  return router
}
```

**Step 2: Update server index to load coursepacks and mount routes**

Replace `packages/server/src/index.ts`:

```ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { checkConnection } from "./db"
import { loadAllCoursepacks } from "./coursepack-loader"
import { createCoursepackRoutes } from "./routes/coursepacks"

const app = new Hono()

// Middleware
app.use("*", logger())
app.use("/api/*", cors())

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err)
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    500,
  )
})

// Load coursepacks
const coursepacks = await loadAllCoursepacks()

// Routes
app.get("/api/health", async (c) => {
  const mongoConnected = await checkConnection()
  return c.json({
    status: mongoConnected ? "ok" : "degraded",
    mongo: mongoConnected ? "connected" : "disconnected",
    coursepacks: coursepacks.size,
    uptime: process.uptime(),
  })
})

app.route("/api/coursepacks", createCoursepackRoutes(coursepacks))

const port = parseInt(process.env.PORT ?? "3000", 10)

export default {
  port,
  fetch: app.fetch,
}

export { app, coursepacks }
```

**Step 3: Test manually**

```bash
cd packages/server && bun run src/index.ts &
sleep 2
curl http://localhost:3000/api/coursepacks | jq
curl http://localhost:3000/api/coursepacks/crud-essentials | jq
curl -X POST http://localhost:3000/api/coursepacks/crud-essentials/seed | jq
curl http://localhost:3000/api/coursepacks/crud-essentials/modules/01-reading-documents/challenges/01-find-all | jq
kill %1
```
Expected: Valid JSON responses for all endpoints

**Step 4: Commit**

```bash
git add packages/server/src/
git commit -m "feat: add coursepack API routes (list, get, seed, modules, challenges)"
```

---

## Phase 2: Challenge Engine

### Task 12: Query Executor

**Files:**
- Create: `packages/server/src/executor.ts`

**Step 1: Implement query executor**

Create `packages/server/src/executor.ts`:

```ts
import type { Collection, Db } from "mongodb"
import { parse, translate, ParseError, type QueryPlan } from "@mongoquest/shared"
import { getDb } from "./db"

const READ_OPERATIONS = new Set(["find", "findOne", "countDocuments"])
const QUERY_TIMEOUT_MS = 5000

export interface ExecutionResult {
  result: unknown
  plan: QueryPlan
}

export async function executeQuery(
  query: string,
  dbName: string,
): Promise<ExecutionResult> {
  if (!query.trim()) {
    throw new ParseError("Please enter a MongoDB query before clicking Run.", 0, query)
  }

  const ast = parse(query)
  const plan = translate(ast)

  const isRead = READ_OPERATIONS.has(plan.operation)
  const db = await getDb(dbName, !isRead)
  const collection = db.collection(plan.collection)

  const result = await executePlan(collection, plan)
  return { result, plan }
}

async function executePlan(collection: Collection, plan: QueryPlan): Promise<unknown> {
  switch (plan.operation) {
    case "find": {
      let cursor = collection.find(plan.filter ?? {}, { maxTimeMS: QUERY_TIMEOUT_MS })
      if (plan.options.projection) cursor = cursor.project(plan.options.projection)
      if (plan.options.sort) cursor = cursor.sort(plan.options.sort)
      if (plan.options.skip) cursor = cursor.skip(plan.options.skip)
      if (plan.options.limit) cursor = cursor.limit(plan.options.limit)
      return cursor.toArray()
    }

    case "findOne": {
      return collection.findOne(plan.filter ?? {}, {
        maxTimeMS: QUERY_TIMEOUT_MS,
        projection: plan.options.projection,
      })
    }

    case "countDocuments": {
      return collection.countDocuments(plan.filter ?? {}, { maxTimeMS: QUERY_TIMEOUT_MS })
    }

    case "insertOne": {
      return collection.insertOne(plan.document as any)
    }

    case "insertMany": {
      return collection.insertMany(plan.documents as any[])
    }

    case "updateOne": {
      return collection.updateOne(plan.filter ?? {}, plan.update as any)
    }

    case "updateMany": {
      return collection.updateMany(plan.filter ?? {}, plan.update as any)
    }

    case "deleteOne": {
      return collection.deleteOne(plan.filter ?? {})
    }

    case "deleteMany": {
      return collection.deleteMany(plan.filter ?? {})
    }

    default:
      throw new Error(`Unsupported operation: ${plan.operation}`)
  }
}
```

**Step 2: Commit**

```bash
git add packages/server/src/executor.ts
git commit -m "feat: add query executor translating parsed mongosh to MongoDB driver calls"
```

---

### Task 13: Validation Engine

**Files:**
- Create: `packages/server/src/validation/output-match.ts`
- Create: `packages/server/src/validation/document-check.ts`
- Create: `packages/server/src/validation/index.ts`
- Test: `packages/server/src/validation/__tests__/output-match.unit.test.ts`

**Step 1: Write failing tests for output_match**

Create `packages/server/src/validation/__tests__/output-match.unit.test.ts`:

```ts
import { describe, expect, it } from "bun:test"
import { compareResults } from "../output-match"

describe("compareResults", () => {
  it("matches identical arrays", () => {
    const actual = [{ name: "Alice" }, { name: "Bob" }]
    const expected = [{ name: "Alice" }, { name: "Bob" }]
    const result = compareResults(actual, expected, {})
    expect(result.passed).toBe(true)
  })

  it("matches regardless of order by default", () => {
    const actual = [{ name: "Bob" }, { name: "Alice" }]
    const expected = [{ name: "Alice" }, { name: "Bob" }]
    const result = compareResults(actual, expected, {})
    expect(result.passed).toBe(true)
  })

  it("fails on order mismatch when orderSensitive", () => {
    const actual = [{ name: "Bob" }, { name: "Alice" }]
    const expected = [{ name: "Alice" }, { name: "Bob" }]
    const result = compareResults(actual, expected, { orderSensitive: true })
    expect(result.passed).toBe(false)
    expect(result.feedback).toContain("wrong order")
  })

  it("strips _id by default", () => {
    const actual = [{ _id: "1", name: "Alice" }]
    const expected = [{ _id: "2", name: "Alice" }]
    const result = compareResults(actual, expected, {})
    expect(result.passed).toBe(true)
  })

  it("compares _id when compareIds is true", () => {
    const actual = [{ _id: "1", name: "Alice" }]
    const expected = [{ _id: "2", name: "Alice" }]
    const result = compareResults(actual, expected, { compareIds: true })
    expect(result.passed).toBe(false)
  })

  it("reports wrong count", () => {
    const actual = [{ name: "Alice" }]
    const expected = [{ name: "Alice" }, { name: "Bob" }]
    const result = compareResults(actual, expected, {})
    expect(result.passed).toBe(false)
    expect(result.feedback).toContain("1")
    expect(result.feedback).toContain("2")
  })

  it("supports subset mode", () => {
    const actual = [{ name: "Alice", email: "a@b.com" }, { name: "Bob", email: "b@b.com" }]
    const expected = [{ name: "Alice", email: "a@b.com" }]
    const result = compareResults(actual, expected, { subset: true })
    expect(result.passed).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test packages/server/src/validation/__tests__/output-match.unit.test.ts
```
Expected: FAIL

**Step 3: Implement output_match**

Create `packages/server/src/validation/output-match.ts`:

```ts
export interface CompareOptions {
  orderSensitive?: boolean
  compareIds?: boolean
  subset?: boolean
}

export interface ValidationResult {
  passed: boolean
  feedback: string
}

export function compareResults(
  actual: unknown[],
  expected: unknown[],
  options: CompareOptions,
): ValidationResult {
  const { orderSensitive = false, compareIds = false, subset = false } = options

  // Strip _id if not comparing
  const strip = (docs: unknown[]): Record<string, unknown>[] =>
    docs.map((doc) => {
      const copy = { ...(doc as Record<string, unknown>) }
      if (!compareIds) delete copy._id
      return copy
    })

  const actualDocs = strip(actual)
  const expectedDocs = strip(expected)

  // Count check (skip for subset mode)
  if (!subset && actualDocs.length !== expectedDocs.length) {
    return {
      passed: false,
      feedback: `Your query returned ${actualDocs.length} documents, expected ${expectedDocs.length}.`,
    }
  }

  if (subset) {
    // Every expected doc must exist in actual
    for (const expDoc of expectedDocs) {
      const found = actualDocs.some((actDoc) => deepEqual(actDoc, expDoc))
      if (!found) {
        return {
          passed: false,
          feedback: "Your result is missing some expected documents. Check your filter or projection.",
        }
      }
    }
    return { passed: true, feedback: "" }
  }

  if (orderSensitive) {
    for (let i = 0; i < expectedDocs.length; i++) {
      if (!deepEqual(actualDocs[i], expectedDocs[i])) {
        return {
          passed: false,
          feedback: "The documents are correct but in the wrong order. Check your .sort() direction.",
        }
      }
    }
  } else {
    const sortFn = (a: unknown, b: unknown) =>
      JSON.stringify(a, Object.keys(a as object).sort()) >
      JSON.stringify(b, Object.keys(b as object).sort())
        ? 1
        : -1

    const sortedActual = [...actualDocs].sort(sortFn)
    const sortedExpected = [...expectedDocs].sort(sortFn)

    for (let i = 0; i < sortedExpected.length; i++) {
      if (!deepEqual(sortedActual[i], sortedExpected[i])) {
        return {
          passed: false,
          feedback: "Your query returned different documents than expected. Check your filter condition.",
        }
      }
    }
  }

  return { passed: true, feedback: "" }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqual(val, b[i]))
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj).sort()
    const bKeys = Object.keys(bObj).sort()
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key, i) => key === bKeys[i] && deepEqual(aObj[key], bObj[key]))
  }

  return false
}
```

**Step 4: Run tests to verify they pass**

```bash
bun test packages/server/src/validation/__tests__/output-match.unit.test.ts
```
Expected: ALL PASS

**Step 5: Implement document_check**

Create `packages/server/src/validation/document-check.ts`:

```ts
import type { Db } from "mongodb"
import type { ValidationResult } from "./output-match"

interface CheckBase {
  type: string
  collection: string
  filter: Record<string, unknown>
}

interface CountCheck extends CheckBase {
  type: "count"
  expected: number
}

interface ExistsCheck extends CheckBase {
  type: "exists"
}

interface NotExistsCheck extends CheckBase {
  type: "notExists"
}

interface FieldEqualsCheck extends CheckBase {
  type: "fieldEquals"
  field: string
  expected: unknown
}

type DocumentCheck = CountCheck | ExistsCheck | NotExistsCheck | FieldEqualsCheck

export async function runDocumentChecks(
  db: Db,
  checks: DocumentCheck[],
): Promise<ValidationResult> {
  for (const check of checks) {
    const collection = db.collection(check.collection)

    switch (check.type) {
      case "count": {
        const count = await collection.countDocuments(check.filter)
        if (count !== check.expected) {
          return {
            passed: false,
            feedback: `Expected ${check.expected} matching documents in '${check.collection}', but found ${count}.`,
          }
        }
        break
      }

      case "exists": {
        const doc = await collection.findOne(check.filter)
        if (!doc) {
          return {
            passed: false,
            feedback: `The expected document was not found in the '${check.collection}' collection after your query ran.`,
          }
        }
        break
      }

      case "notExists": {
        const doc = await collection.findOne(check.filter)
        if (doc) {
          return {
            passed: false,
            feedback: `The document still exists in '${check.collection}'. Check your filter in your delete operation.`,
          }
        }
        break
      }

      case "fieldEquals": {
        const doc = await collection.findOne(check.filter)
        if (!doc) {
          return {
            passed: false,
            feedback: `Could not find the target document in '${check.collection}' to verify the update.`,
          }
        }
        if (doc[check.field] !== check.expected) {
          return {
            passed: false,
            feedback: `The '${check.field}' field is ${JSON.stringify(doc[check.field])}, expected ${JSON.stringify(check.expected)}. Check your update operator.`,
          }
        }
        break
      }
    }
  }

  return { passed: true, feedback: "" }
}
```

**Step 6: Create validation index**

Create `packages/server/src/validation/index.ts`:

```ts
export { compareResults, type CompareOptions, type ValidationResult } from "./output-match"
export { runDocumentChecks } from "./document-check"
```

**Step 7: Commit**

```bash
git add packages/server/src/validation/
git commit -m "feat: add validation engine with output_match and document_check strategies"
```

---

### Task 14: Challenge Run Endpoint

**Files:**
- Create: `packages/server/src/routes/run.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Implement run endpoint**

Create `packages/server/src/routes/run.ts`:

```ts
import { Hono } from "hono"
import { ParseError } from "@mongoquest/shared"
import type { LoadedCoursepack } from "../coursepack-loader"
import { executeQuery, type ExecutionResult } from "../executor"
import { resetCollection } from "../seeder"
import { getDb } from "../db"
import { compareResults } from "../validation/output-match"
import { runDocumentChecks } from "../validation/document-check"

const READ_OPERATIONS = new Set(["find", "findOne", "countDocuments"])

export function createRunRoutes(coursepacks: Map<string, LoadedCoursepack>) {
  const router = new Hono()

  router.post(
    "/:id/modules/:moduleId/challenges/:challengeId/run",
    async (c) => {
      // Lookup coursepack, module, challenge
      const cp = coursepacks.get(c.req.param("id"))
      if (!cp) {
        return c.json({ error: { code: "COURSEPACK_NOT_FOUND", message: "Coursepack not found" } }, 404)
      }

      const mod = cp.modules.find((m) => m.meta.id === c.req.param("moduleId"))
      if (!mod) {
        return c.json({ error: { code: "MODULE_NOT_FOUND", message: "Module not found" } }, 404)
      }

      const challenge = mod.challenges.find((ch) => ch.id === c.req.param("challengeId"))
      if (!challenge) {
        return c.json({ error: { code: "CHALLENGE_NOT_FOUND", message: "Challenge not found" } }, 404)
      }

      const body = await c.req.json<{ query: string }>()
      const dbName = `mongoquest_${cp.manifest.id.replace(/-/g, "_")}`

      // Reset collection for write challenges
      const isRead = READ_OPERATIONS.has(challenge.type)
      if (!isRead) {
        const seedData = cp.seedData.get(challenge.collection) ?? []
        await resetCollection(dbName, challenge.collection, seedData)
      }

      // Execute the learner's query
      let execution: ExecutionResult
      try {
        execution = await executeQuery(body.query, dbName)
      } catch (err) {
        if (err instanceof ParseError) {
          return c.json({
            success: false,
            result: null,
            feedback: null,
            error: err.toUserMessage(),
          }, 400)
        }
        // MongoDB runtime error
        const message = err instanceof Error ? err.message : String(err)
        return c.json({
          success: false,
          result: null,
          feedback: null,
          error: message,
        }, 400)
      }

      // Validate
      const validation = challenge.validation

      if (validation.strategy === "output_match") {
        // Execute the expected query to get expected results
        const expectedFilter = validation.expected.filter ?? {}
        const db = await getDb(dbName, false)
        const collection = db.collection(challenge.collection)

        let cursor = collection.find(expectedFilter)
        if (validation.expected.projection) cursor = cursor.project(validation.expected.projection)
        if (validation.expected.sort) cursor = cursor.sort(validation.expected.sort)
        if (validation.expected.skip) cursor = cursor.skip(validation.expected.skip)
        if (validation.expected.limit) cursor = cursor.limit(validation.expected.limit)

        const expectedResult = await cursor.toArray()
        const actualResult = Array.isArray(execution.result) ? execution.result : [execution.result]

        const compareResult = compareResults(actualResult, expectedResult, {
          orderSensitive: validation.orderSensitive,
          compareIds: validation.compareIds,
          subset: validation.subset,
        })

        if (compareResult.passed) {
          return c.json({
            success: true,
            result: execution.result,
            feedback: `Correct! ${challenge.concept}`,
            xp: challenge.xp,
          })
        }

        return c.json({
          success: false,
          result: execution.result,
          feedback: compareResult.feedback,
          error: null,
        })
      }

      if (validation.strategy === "document_check") {
        const db = await getDb(dbName, false)
        const checkResult = await runDocumentChecks(db, validation.checks as any)

        if (checkResult.passed) {
          return c.json({
            success: true,
            result: execution.result,
            feedback: `Correct! ${challenge.concept}`,
            xp: challenge.xp,
          })
        }

        return c.json({
          success: false,
          result: execution.result,
          feedback: checkResult.feedback,
          error: null,
        })
      }

      // custom_validator — not implemented for MVP
      return c.json({
        success: false,
        result: null,
        feedback: "Custom validators are not yet supported.",
        error: null,
      })
    },
  )

  return router
}
```

**Step 2: Mount run routes in server index**

Add to `packages/server/src/index.ts` after the coursepack routes:

```ts
import { createRunRoutes } from "./routes/run"

// ... existing code ...

app.route("/api/coursepacks", createCoursepackRoutes(coursepacks))
app.route("/api/coursepacks", createRunRoutes(coursepacks))
```

**Step 3: Test the full flow manually**

```bash
# Seed the database first
curl -X POST http://localhost:3000/api/coursepacks/crud-essentials/seed | jq

# Run a correct query
curl -X POST http://localhost:3000/api/coursepacks/crud-essentials/modules/01-reading-documents/challenges/01-find-all/run \
  -H "Content-Type: application/json" \
  -d '{"query": "db.customers.find()"}' | jq

# Run an incorrect query
curl -X POST http://localhost:3000/api/coursepacks/crud-essentials/modules/01-reading-documents/challenges/01-find-all/run \
  -H "Content-Type: application/json" \
  -d '{"query": "db.customers.find({ name: \"Alice Johnson\" })"}' | jq
```
Expected: First returns `success: true`, second returns `success: false` with feedback

**Step 4: Commit**

```bash
git add packages/server/src/routes/run.ts packages/server/src/index.ts
git commit -m "feat: add challenge run endpoint with full parse-execute-validate pipeline"
```

---

## Phase 3: Frontend

> **Note:** Phase 3 tasks build the SvelteKit frontend. Each task creates a specific component or page. Use `@superpowers:frontend-design` skill when implementing these tasks for high design quality.

### Task 15: SvelteKit Scaffold

**Files:**
- Create: `packages/client/` (via `bunx sv create`)
- Modify: `packages/client/package.json`
- Modify: `packages/client/svelte.config.js`

**Step 1: Scaffold SvelteKit project**

```bash
cd packages && bunx sv create client --template minimal --types ts
cd client && bun install
```

**Step 2: Configure adapter-static as SPA**

Update `packages/client/svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html',
      precompress: false,
      strict: false,
    }),
  },
};

export default config;
```

**Step 3: Install dependencies**

```bash
cd packages/client
bun add -d @sveltejs/adapter-static tailwindcss @tailwindcss/vite
bun add monaco-editor @mongoquest/shared
```

**Step 4: Add Tailwind to `vite.config.ts`**

```ts
import tailwindcss from "@tailwindcss/vite"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
})
```

**Step 5: Add `@import "tailwindcss"` to `src/app.css`**

```css
@import "tailwindcss";
```

**Step 6: Add SPA prerender config**

Create `packages/client/src/routes/+layout.ts`:

```ts
export const prerender = false
export const ssr = false
```

**Step 7: Verify dev server starts**

```bash
cd packages/client && bun run dev
```
Expected: SvelteKit dev server starts on port 5173

**Step 8: Commit**

```bash
git add packages/client/
git commit -m "feat: scaffold SvelteKit client with adapter-static, Tailwind CSS, and Monaco"
```

---

### Task 16: Progress Store

**Files:**
- Create: `packages/client/src/lib/stores/progress.ts`
- Test: `packages/client/src/lib/stores/__tests__/progress.unit.test.ts`

**Step 1: Write failing tests**

Create `packages/client/src/lib/stores/__tests__/progress.unit.test.ts`:

```ts
import { describe, expect, it, beforeEach } from "bun:test"
import {
  createProgressStore,
  type ProgressState,
  calculateStreak,
  mergeProgress,
} from "../progress"

describe("calculateStreak", () => {
  it("returns 1 for first activity", () => {
    const result = calculateStreak(undefined, undefined, "2026-03-04")
    expect(result).toEqual({ current: 1, lastActiveDate: "2026-03-04" })
  })

  it("increments streak for consecutive days", () => {
    const result = calculateStreak(3, "2026-03-03", "2026-03-04")
    expect(result).toEqual({ current: 4, lastActiveDate: "2026-03-04" })
  })

  it("does not change streak for same day", () => {
    const result = calculateStreak(3, "2026-03-04", "2026-03-04")
    expect(result).toEqual({ current: 3, lastActiveDate: "2026-03-04" })
  })

  it("resets streak after gap", () => {
    const result = calculateStreak(5, "2026-03-01", "2026-03-04")
    expect(result).toEqual({ current: 1, lastActiveDate: "2026-03-04" })
  })
})

describe("mergeProgress", () => {
  it("keeps latest completedAt per challenge", () => {
    const local: ProgressState = {
      coursepacks: {
        cp1: { modules: { m1: { challenges: {
          c1: { completed: true, completedAt: "2026-03-01T10:00:00Z" },
        } } } },
      },
      totalXp: 10,
      streak: { current: 1, lastActiveDate: "2026-03-01" },
    }
    const remote: ProgressState = {
      coursepacks: {
        cp1: { modules: { m1: { challenges: {
          c1: { completed: true, completedAt: "2026-03-02T10:00:00Z" },
          c2: { completed: true, completedAt: "2026-03-02T11:00:00Z" },
        } } } },
      },
      totalXp: 20,
      streak: { current: 2, lastActiveDate: "2026-03-02" },
    }
    const merged = mergeProgress(local, remote)
    expect(merged.coursepacks.cp1.modules.m1.challenges.c1.completedAt).toBe("2026-03-02T10:00:00Z")
    expect(merged.coursepacks.cp1.modules.m1.challenges.c2).toBeDefined()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test packages/client/src/lib/stores/__tests__/progress.unit.test.ts
```
Expected: FAIL

**Step 3: Implement progress store**

Create `packages/client/src/lib/stores/progress.ts`:

```ts
export interface ChallengeProgress {
  completed: boolean
  completedAt: string
}

export interface ProgressState {
  coursepacks: {
    [coursepackId: string]: {
      modules: {
        [moduleId: string]: {
          challenges: {
            [challengeId: string]: ChallengeProgress
          }
        }
      }
    }
  }
  totalXp: number
  streak: {
    current: number
    lastActiveDate: string
  }
}

const STORAGE_KEY = "mongoquest_progress"

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return defaultProgress()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultProgress()
}

export function saveProgress(state: ProgressState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function defaultProgress(): ProgressState {
  return {
    coursepacks: {},
    totalXp: 0,
    streak: { current: 0, lastActiveDate: "" },
  }
}

export function markChallengeComplete(
  state: ProgressState,
  coursepackId: string,
  moduleId: string,
  challengeId: string,
  xp: number,
): ProgressState {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  const newState = structuredClone(state)

  // Ensure nested structure exists
  if (!newState.coursepacks[coursepackId]) {
    newState.coursepacks[coursepackId] = { modules: {} }
  }
  if (!newState.coursepacks[coursepackId].modules[moduleId]) {
    newState.coursepacks[coursepackId].modules[moduleId] = { challenges: {} }
  }

  const existing = newState.coursepacks[coursepackId].modules[moduleId].challenges[challengeId]
  if (existing?.completed) {
    // Already completed — no XP, no streak update
    return state
  }

  newState.coursepacks[coursepackId].modules[moduleId].challenges[challengeId] = {
    completed: true,
    completedAt: now,
  }

  newState.totalXp += xp
  const streak = calculateStreak(
    newState.streak.current,
    newState.streak.lastActiveDate || undefined,
    today,
  )
  newState.streak = streak

  return newState
}

export function isChallengeCompleted(
  state: ProgressState,
  coursepackId: string,
  moduleId: string,
  challengeId: string,
): boolean {
  return !!state.coursepacks[coursepackId]?.modules[moduleId]?.challenges[challengeId]?.completed
}

export function calculateStreak(
  currentStreak: number | undefined,
  lastActiveDate: string | undefined,
  today: string,
): { current: number; lastActiveDate: string } {
  if (!lastActiveDate || !currentStreak) {
    return { current: 1, lastActiveDate: today }
  }

  if (lastActiveDate === today) {
    return { current: currentStreak, lastActiveDate: today }
  }

  const last = new Date(lastActiveDate)
  const now = new Date(today)
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return { current: currentStreak + 1, lastActiveDate: today }
  }

  return { current: 1, lastActiveDate: today }
}

export function mergeProgress(
  local: ProgressState,
  remote: ProgressState,
): ProgressState {
  const merged = structuredClone(local)

  for (const [cpId, cpData] of Object.entries(remote.coursepacks)) {
    if (!merged.coursepacks[cpId]) {
      merged.coursepacks[cpId] = cpData
      continue
    }
    for (const [modId, modData] of Object.entries(cpData.modules)) {
      if (!merged.coursepacks[cpId].modules[modId]) {
        merged.coursepacks[cpId].modules[modId] = modData
        continue
      }
      for (const [chId, chData] of Object.entries(modData.challenges)) {
        const existing = merged.coursepacks[cpId].modules[modId].challenges[chId]
        if (!existing || new Date(chData.completedAt) > new Date(existing.completedAt)) {
          merged.coursepacks[cpId].modules[modId].challenges[chId] = chData
        }
      }
    }
  }

  // Recalculate totalXp from merged state
  let totalXp = 0
  for (const cp of Object.values(merged.coursepacks)) {
    for (const mod of Object.values(cp.modules)) {
      for (const ch of Object.values(mod.challenges)) {
        if (ch.completed) totalXp += 10 // default XP, will need refinement
      }
    }
  }
  merged.totalXp = Math.max(merged.totalXp, totalXp)

  return merged
}

export function createProgressStore() {
  let state = $state(loadProgress())

  return {
    get state() { return state },
    complete(coursepackId: string, moduleId: string, challengeId: string, xp: number) {
      state = markChallengeComplete(state, coursepackId, moduleId, challengeId, xp)
      saveProgress(state)
    },
    isCompleted(coursepackId: string, moduleId: string, challengeId: string): boolean {
      return isChallengeCompleted(state, coursepackId, moduleId, challengeId)
    },
    mergeRemote(remote: ProgressState) {
      state = mergeProgress(state, remote)
      saveProgress(state)
    },
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
bun test packages/client/src/lib/stores/__tests__/progress.unit.test.ts
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/client/src/lib/stores/
git commit -m "feat: add progress store with localStorage persistence, streak logic, and merge"
```

---

### Task 17: API Client

**Files:**
- Create: `packages/client/src/lib/api.ts`

**Step 1: Implement API client**

Create `packages/client/src/lib/api.ts`:

```ts
const BASE = "/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw data.error ?? data
  return data as T
}

export const api = {
  getCoursepacks: () => request<{ coursepacks: any[] }>("/coursepacks"),

  getCoursepack: (id: string) => request<any>(`/coursepacks/${id}`),

  seedCoursepack: (id: string) =>
    request<any>(`/coursepacks/${id}/seed`, { method: "POST" }),

  getChallenge: (cpId: string, modId: string, chId: string) =>
    request<any>(`/coursepacks/${cpId}/modules/${modId}/challenges/${chId}`),

  runChallenge: (cpId: string, modId: string, chId: string, query: string) =>
    request<any>(`/coursepacks/${cpId}/modules/${modId}/challenges/${chId}/run`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  syncGistSave: (token: string, gistId: string | null, progress: any) =>
    request<any>("/sync/gist/save", {
      method: "POST",
      body: JSON.stringify({ token, gistId, progress }),
    }),

  syncGistLoad: (token: string, gistId: string) =>
    request<any>("/sync/gist/load", {
      method: "POST",
      body: JSON.stringify({ token, gistId }),
    }),
}
```

**Step 2: Commit**

```bash
git add packages/client/src/lib/api.ts
git commit -m "feat: add typed API client for all server endpoints"
```

---

### Task 18: Frontend Pages and Components

> This task covers all SvelteKit pages and components. It is deliberately a single large task because the frontend components are tightly coupled. Use `@superpowers:frontend-design` skill for the UI implementation.

**Files:**
- Create: `packages/client/src/routes/+layout.svelte`
- Create: `packages/client/src/routes/+page.svelte` (welcome)
- Create: `packages/client/src/routes/learn/[coursepackId]/+page.svelte` (overview)
- Create: `packages/client/src/routes/learn/[coursepackId]/[moduleId]/[challengeId]/+page.svelte` (challenge)
- Create: `packages/client/src/lib/components/ChallengePane.svelte`
- Create: `packages/client/src/lib/components/EditorPane.svelte`
- Create: `packages/client/src/lib/components/MonacoEditor.svelte`
- Create: `packages/client/src/lib/components/OutputDisplay.svelte`
- Create: `packages/client/src/lib/components/ModuleSidebar.svelte`
- Create: `packages/client/src/lib/components/ProgressBar.svelte`
- Create: `packages/client/src/lib/components/Toast.svelte`

**Implementation guidance:**

1. Build the root layout with nav bar (logo, XP counter, streak badge, settings gear)
2. Build the welcome page: lists coursepacks, click to select and seed
3. Build the coursepack overview page: module list with progress bars
4. Build the challenge page: split-pane layout (ChallengePane left, EditorPane right)
5. ChallengePane: title, description, concept, expandable hint (click to reveal)
6. EditorPane: MonacoEditor + Run button + OutputDisplay below
7. MonacoEditor: wraps `monaco-editor` with JS mode, custom dark theme, autocomplete for `db.<collections>`
8. OutputDisplay: formatted JSON result, pass/fail indicator (green check / red X), feedback text
9. ModuleSidebar: collapsible, shows locked/available/completed/current states per TRD Section 4.6
10. On success: call `progressStore.complete()`, show feedback, enable "Next Challenge" button
11. On failure: show feedback, keep editor content, allow retry

**Step N: Commit after each major component**

```bash
git commit -m "feat: add <component-name>"
```

---

### Task 19: Serve Static Frontend from Hono

**Files:**
- Modify: `packages/server/src/index.ts`

**Step 1: Add static file serving**

Add to `packages/server/src/index.ts`:

```ts
import { serveStatic } from "hono/bun"

// ... after all /api routes ...

// Serve SvelteKit static build
app.use("/*", serveStatic({ root: "../client/build" }))

// SPA fallback
app.get("/*", serveStatic({ path: "../client/build/200.html" }))
```

**Step 2: Build client and test**

```bash
cd packages/client && bun run build
cd ../server && bun run src/index.ts
```
Open `http://localhost:3000` — should show the welcome page

**Step 3: Commit**

```bash
git add packages/server/src/index.ts
git commit -m "feat: serve SvelteKit static build from Hono"
```

---

## Phase 4: Content

### Task 20: Write All 35 CRUD Essentials Challenges

**Files:**
- Create: All challenge JSON files under `coursepacks/crud-essentials/modules/`
- Create: All module.json files for modules 02-06
- Modify: Expand seed data to full ~350 documents

**Implementation guidance per the PRD Section 6.2:**

| Module | # | Key Concepts |
|--------|---|-------------|
| 01 — Reading Documents | 8 | find(), findOne(), filters, projections, sort, limit, skip, counting |
| 02 — Creating Documents | 5 | insertOne(), insertMany(), _id generation, schema flexibility |
| 03 — Updating Documents | 6 | $set, $inc, $push, $pull, updateOne(), updateMany(), upsert |
| 04 — Deleting Documents | 4 | deleteOne(), deleteMany(), filter safety, soft deletes |
| 05 — Query Operators | 7 | $gt/$lt, $in/$nin, $regex, $exists, $and/$or, nested fields, array queries |
| 06 — Capstone | 5 | Multi-step scenarios combining all CRUD operations |

Each challenge JSON follows the schema from TRD Section 7.3. Use `output_match` for read challenges, `document_check` for write challenges.

**Step 1: Expand seed data to ~350 documents**

Generate realistic Metro Mart data: ~50 customers, ~100 products, ~200 orders.

**Step 2: Write challenges for each module**

Follow the pattern established in `01-find-all.json`. Ensure each challenge builds on the previous.

**Step 3: Update coursepack.json modules list**

```json
"modules": [
  "01-reading-documents",
  "02-creating-documents",
  "03-updating-documents",
  "04-deleting-documents",
  "05-query-operators",
  "06-capstone"
]
```

**Step 4: Validate all challenges load**

```bash
curl http://localhost:3000/api/coursepacks/crud-essentials | jq '.modules | length'
```
Expected: `6`

**Step 5: Commit per module**

```bash
git commit -m "content: add module 0N - <module name> challenges"
```

---

## Phase 5: Polish and Launch

### Task 21: Gist Sync Endpoints

**Files:**
- Create: `packages/server/src/routes/sync.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Implement Gist sync routes**

Create `packages/server/src/routes/sync.ts`:

```ts
import { Hono } from "hono"

const GITHUB_API = "https://api.github.com"

export const syncRouter = new Hono()

syncRouter.post("/gist/save", async (c) => {
  const { token, gistId, progress } = await c.req.json()

  const content = JSON.stringify(progress, null, 2)

  try {
    if (gistId) {
      // Update existing gist
      const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: { "mongoquest-progress.json": { content } },
        }),
      })
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
      const data = await res.json()
      return c.json({ success: true, gistId: data.id })
    }

    // Create new gist
    const res = await fetch(`${GITHUB_API}/gists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: "MongoQuest Progress",
        public: false,
        files: { "mongoquest-progress.json": { content } },
      }),
    })
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const data = await res.json()
    return c.json({ success: true, gistId: data.id })
  } catch (err) {
    return c.json(
      { error: { code: "GIST_SYNC_ERROR", message: String(err) } },
      502,
    )
  }
})

syncRouter.post("/gist/load", async (c) => {
  const { token, gistId } = await c.req.json()

  try {
    const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const data = await res.json()
    const content = data.files["mongoquest-progress.json"]?.content
    if (!content) throw new Error("Progress file not found in gist")
    return c.json({ progress: JSON.parse(content) })
  } catch (err) {
    return c.json(
      { error: { code: "GIST_SYNC_ERROR", message: String(err) } },
      502,
    )
  }
})
```

**Step 2: Mount in server index**

```ts
import { syncRouter } from "./routes/sync"
app.route("/api/sync", syncRouter)
```

**Step 3: Commit**

```bash
git add packages/server/src/routes/sync.ts packages/server/src/index.ts
git commit -m "feat: add Gist sync endpoints for save/load progress"
```

---

### Task 22: Dockerfile

**Files:**
- Create: `Dockerfile`

**Step 1: Write multi-stage Dockerfile**

See TRD Section 8.2 for the exact Dockerfile content.

**Step 2: Add app service to docker-compose.yml**

```yaml
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
```

**Step 3: Test full stack**

```bash
docker compose up --build
```
Open `http://localhost:3000` — full app should work

**Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: add multi-stage Dockerfile and complete Docker Compose config"
```

---

### Task 23: CI/CD GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write CI workflow**

See TRD Section 10.1 for the exact workflow structure. Implement with four jobs: lint-and-typecheck, unit-tests, integration-tests (with MongoDB service container), and e2e-tests.

**Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow for lint, typecheck, and tests"
```

---

### Task 24: E2E Tests with Playwright

**Files:**
- Create: `packages/client/playwright.config.ts`
- Create: `packages/client/tests/onboarding.spec.ts`
- Create: `packages/client/tests/challenge-flow.spec.ts`

**Step 1: Install Playwright**

```bash
cd packages/client && bun add -d @playwright/test && bunx playwright install
```

**Step 2: Write E2E tests**

See TRD Section 9.3 for the test flows to cover: onboarding, challenge success, challenge failure, progress persistence, module unlock.

**Step 3: Run E2E tests**

```bash
docker compose up -d
cd packages/client && bunx playwright test
docker compose down
```

**Step 4: Commit**

```bash
git add packages/client/playwright.config.ts packages/client/tests/
git commit -m "test: add Playwright E2E tests for onboarding and challenge flows"
```

---

### Task 25: Integration Tests

**Files:**
- Create: `packages/server/src/__tests__/api.integration.test.ts`

**Step 1: Write integration tests**

Test all API endpoints against a real MongoDB instance. See TRD Section 9.2 for the full list.

Key tests:
- `GET /api/coursepacks` returns loaded packs
- `POST .../seed` creates correct collections
- `POST .../run` with correct query returns success
- `POST .../run` with wrong query returns feedback
- `POST .../run` with parse error returns error
- Security: read-only operations don't mutate data

**Step 2: Run**

```bash
bun test --filter integration packages/server/
```

**Step 3: Commit**

```bash
git add packages/server/src/__tests__/
git commit -m "test: add API integration tests against real MongoDB"
```

---

### Task 26: Final Polish

**Files:**
- Modify: `docker-compose.yml` (optimize)
- Modify: `Dockerfile` (optimize image size)

**Steps:**
1. Optimize Docker image size (verify <150MB)
2. Add `.dockerignore` (node_modules, .git, etc.)
3. Verify `docker compose up` works from clean clone
4. Final commit

```bash
git commit -m "chore: final Docker optimization and polish"
```
