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

	it("translates insertMany", () => {
		const ast: MongoshAST = {
			collection: "products",
			method: "insertMany",
			args: [[{ a: 1 }, { a: 2 }]],
			chain: [],
		}
		const plan = translate(ast)
		expect(plan.operation).toBe("insertMany")
		expect(plan.documents).toEqual([{ a: 1 }, { a: 2 }])
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
			chain: [
				{ method: "skip", args: [10] },
				{ method: "limit", args: [5] },
			],
		}
		const plan = translate(ast)
		expect(plan.options.skip).toBe(10)
		expect(plan.options.limit).toBe(5)
	})

	it("translates find with projection as second arg", () => {
		const ast: MongoshAST = {
			collection: "col",
			method: "find",
			args: [{}, { name: 1, email: 1 }],
			chain: [],
		}
		const plan = translate(ast)
		expect(plan.options.projection).toEqual({ name: 1, email: 1 })
	})
})
