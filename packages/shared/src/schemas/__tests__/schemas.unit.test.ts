import { describe, expect, it } from "bun:test"
import { CoursepackManifestSchema, ModuleSchema, ChallengeSchema } from "../index"

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
				checks: [{ type: "exists", collection: "products", filter: { name: "Test" } }],
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
