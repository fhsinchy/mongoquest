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
		const ast = parse("db.col.insertMany([{ a: 1 }, { a: 2 }])")
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

	it("parses find with two arguments (filter + projection)", () => {
		const ast = parse('db.col.find({ status: "a" }, { name: 1, status: 1 })')
		expect(ast.args).toEqual([{ status: "a" }, { name: 1, status: 1 }])
	})

	it("parses deleteMany with filter", () => {
		const ast = parse('db.orders.deleteMany({ status: "cancelled" })')
		expect(ast.method).toBe("deleteMany")
		expect(ast.args).toEqual([{ status: "cancelled" }])
	})
})
