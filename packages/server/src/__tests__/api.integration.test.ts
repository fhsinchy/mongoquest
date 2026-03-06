import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { closeConnections } from "../db"
import { app } from "../index"

function request(path: string, options?: RequestInit) {
	return app.request(path, options)
}

afterAll(async () => {
	await closeConnections()
})

describe("API integration tests", () => {
	test("GET /api/health returns status", async () => {
		const res = await request("/api/health")
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.status).toMatch(/ok|degraded/)
		expect(body.coursepacks).toBeGreaterThanOrEqual(0)
	})

	test("GET /api/coursepacks returns loaded packs", async () => {
		const res = await request("/api/coursepacks")
		expect(res.status).toBe(200)
		const body = (await res.json()) as { coursepacks: unknown[] }
		expect(Array.isArray(body.coursepacks)).toBe(true)
		expect(body.coursepacks.length).toBeGreaterThanOrEqual(1)
	})

	describe("with seeded coursepack", () => {
		const coursepackId = "crud-essentials"
		const moduleId = "01-reading-documents"
		const challengeId = "01-find-all"

		beforeAll(async () => {
			const res = await request(`/api/coursepacks/${coursepackId}/seed`, {
				method: "POST",
			})
			expect(res.status).toBe(200)
		})

		test("POST /api/coursepacks/:id/seed creates correct collections", async () => {
			const res = await request(`/api/coursepacks/${coursepackId}/seed`, {
				method: "POST",
			})
			expect(res.status).toBe(200)
			const body = (await res.json()) as {
				success: boolean
				database: string
				collections: string[]
				documentCount: number
			}
			expect(body.success).toBe(true)
			expect(body.database).toBe("mongoquest_crud_essentials")
			expect(Array.isArray(body.collections)).toBe(true)
			expect(body.collections.length).toBeGreaterThan(0)
			expect(body.documentCount).toBeGreaterThan(0)
		})

		test("POST .../run with correct query returns success", async () => {
			const res = await request(
				`/api/coursepacks/${coursepackId}/modules/${moduleId}/challenges/${challengeId}/run`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query: "db.customers.find()" }),
				},
			)
			expect(res.status).toBe(200)
			const body = (await res.json()) as {
				success: boolean
				result: unknown
				feedback: string
				xp?: number
			}
			expect(body.success).toBe(true)
			expect(body.feedback).toContain("Correct")
			expect(body.xp).toBe(10)
		})

		test("POST .../run with wrong query returns failure with feedback", async () => {
			const res = await request(
				`/api/coursepacks/${coursepackId}/modules/${moduleId}/challenges/${challengeId}/run`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: 'db.customers.find({ name: "nonexistent_person_xyz" })',
					}),
				},
			)
			expect(res.status).toBe(200)
			const body = (await res.json()) as {
				success: boolean
				result: unknown
				feedback: string
			}
			expect(body.success).toBe(false)
			expect(body.feedback).toBeTruthy()
		})

		test("POST .../run with parse error returns error", async () => {
			const res = await request(
				`/api/coursepacks/${coursepackId}/modules/${moduleId}/challenges/${challengeId}/run`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query: "db.customers.find({{" }),
				},
			)
			expect(res.status).toBe(400)
			const body = (await res.json()) as {
				success: boolean
				error: string
			}
			expect(body.success).toBe(false)
			expect(body.error).toBeTruthy()
		})

		test("POST .../run with missing query returns 400", async () => {
			const res = await request(
				`/api/coursepacks/${coursepackId}/modules/${moduleId}/challenges/${challengeId}/run`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				},
			)
			expect(res.status).toBe(400)
		})
	})

	test("GET /api/coursepacks/nonexistent returns 404", async () => {
		const res = await request("/api/coursepacks/nonexistent")
		expect(res.status).toBe(404)
	})
})
