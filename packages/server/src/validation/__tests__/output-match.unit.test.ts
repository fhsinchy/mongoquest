import { describe, expect, it } from "bun:test"
import { compareResults } from "../output-match"

describe("compareResults", () => {
	it("identical arrays match", () => {
		const docs = [{ name: "Alice" }, { name: "Bob" }]
		const result = compareResults(docs, docs)
		expect(result.passed).toBe(true)
	})

	it("matches regardless of order by default", () => {
		const actual = [{ name: "Bob" }, { name: "Alice" }]
		const expected = [{ name: "Alice" }, { name: "Bob" }]
		const result = compareResults(actual, expected)
		expect(result.passed).toBe(true)
	})

	it("fails on order mismatch when orderSensitive is true", () => {
		const actual = [{ name: "Bob" }, { name: "Alice" }]
		const expected = [{ name: "Alice" }, { name: "Bob" }]
		const result = compareResults(actual, expected, { orderSensitive: true })
		expect(result.passed).toBe(false)
	})

	it("strips _id by default", () => {
		const actual = [{ _id: "abc", name: "Alice" }]
		const expected = [{ _id: "xyz", name: "Alice" }]
		const result = compareResults(actual, expected)
		expect(result.passed).toBe(true)
	})

	it("compares _id when compareIds is true", () => {
		const actual = [{ _id: "abc", name: "Alice" }]
		const expected = [{ _id: "xyz", name: "Alice" }]
		const result = compareResults(actual, expected, { compareIds: true })
		expect(result.passed).toBe(false)
	})

	it("reports wrong document count", () => {
		const actual = [{ name: "Alice" }]
		const expected = [{ name: "Alice" }, { name: "Bob" }]
		const result = compareResults(actual, expected)
		expect(result.passed).toBe(false)
		expect(result.feedback).toContain("Expected 2 document(s) but got 1")
	})

	it("subset mode: actual can have extra docs", () => {
		const actual = [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]
		const expected = [{ name: "Alice" }, { name: "Bob" }]
		const result = compareResults(actual, expected, { subset: true })
		expect(result.passed).toBe(true)
	})

	it("subset mode: fails when expected doc is missing", () => {
		const actual = [{ name: "Alice" }]
		const expected = [{ name: "Alice" }, { name: "Bob" }]
		const result = compareResults(actual, expected, { subset: true })
		expect(result.passed).toBe(false)
	})

	it("empty arrays match", () => {
		const result = compareResults([], [])
		expect(result.passed).toBe(true)
	})
})
