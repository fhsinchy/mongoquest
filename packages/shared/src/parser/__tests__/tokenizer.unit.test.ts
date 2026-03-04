import { describe, expect, it } from "bun:test"
import { tokenize } from "../tokenizer"

describe("tokenizer", () => {
	it("tokenizes a simple find query", () => {
		const tokens = tokenize('db.orders.find({ status: "shipped" })')
		const types = tokens.map((t) => t.type)
		expect(types).toEqual([
			"IDENTIFIER",
			"DOT",
			"IDENTIFIER",
			"DOT",
			"IDENTIFIER",
			"LPAREN",
			"LBRACE",
			"IDENTIFIER",
			"COLON",
			"STRING",
			"RBRACE",
			"RPAREN",
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
