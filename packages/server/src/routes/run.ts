import { ParseError } from "@mongoquest/shared"
import { Hono } from "hono"
import type { LoadedCoursepack } from "../coursepack-loader"
import { getDb } from "../db"
import { executeQuery, READ_OPERATIONS } from "../executor"
import { resetCollection } from "../seeder"
import { compareResults, runDocumentChecks } from "../validation"

export function createRunRoutes(coursepacks: Map<string, LoadedCoursepack>) {
	const router = new Hono()

	router.post("/:id/modules/:moduleId/challenges/:challengeId/run", async (c) => {
		const cp = coursepacks.get(c.req.param("id"))
		if (!cp) {
			return c.json(
				{
					error: {
						code: "COURSEPACK_NOT_FOUND",
						message: `Coursepack '${c.req.param("id")}' not found`,
					},
				},
				404,
			)
		}

		const mod = cp.modules.find((m) => m.meta.id === c.req.param("moduleId"))
		if (!mod) {
			return c.json(
				{
					error: {
						code: "MODULE_NOT_FOUND",
						message: `Module '${c.req.param("moduleId")}' not found`,
					},
				},
				404,
			)
		}

		const challenge = mod.challenges.find((ch) => ch.id === c.req.param("challengeId"))
		if (!challenge) {
			return c.json(
				{
					error: {
						code: "CHALLENGE_NOT_FOUND",
						message: `Challenge '${c.req.param("challengeId")}' not found`,
					},
				},
				404,
			)
		}

		const body = await c.req.json().catch(() => null)
		if (!body?.query) {
			return c.json(
				{ error: { code: "MISSING_QUERY", message: "Request body must include a 'query' field" } },
				400,
			)
		}

		const dbName = `mongoquest_${cp.manifest.id.replace(/-/g, "_")}`

		// Reset collection for write operations to ensure repeatable state
		const isRead = READ_OPERATIONS.has(getOperationFromQuery(body.query))
		if (!isRead) {
			const seedData = cp.seedData.get(challenge.collection) ?? []
			await resetCollection(dbName, challenge.collection, seedData)
		}

		let executionResult
		try {
			executionResult = await executeQuery(body.query, dbName)
		} catch (err) {
			if (err instanceof ParseError) {
				return c.json(
					{ success: false, result: null, feedback: null, error: err.toUserMessage() },
					400,
				)
			}
			return c.json(
				{
					success: false,
					result: null,
					feedback: null,
					error: err instanceof Error ? err.message : String(err),
				},
				400,
			)
		}

		const { result, plan } = executionResult
		const validation = challenge.validation

		if (validation.strategy === "custom_validator") {
			return c.json({
				success: false,
				result,
				feedback: "Custom validators are not yet supported",
				error: null,
			})
		}

		if (validation.strategy === "document_check") {
			const db = await getDb(dbName)
			const checkResult = await runDocumentChecks(db, validation.checks)
			if (checkResult.passed) {
				return c.json({
					success: true,
					result,
					feedback: `Correct! ${challenge.concept}`,
					xp: challenge.xp,
				})
			}
			return c.json({ success: false, result, feedback: checkResult.feedback, error: null })
		}

		// output_match strategy
		const db = await getDb(dbName)
		const collection = db.collection(challenge.collection)
		const expectedConfig = validation.expected

		// Build expected results by querying the DB with the challenge's expected config
		let expectedDocs: unknown[]
		const cursor = collection.find(expectedConfig.filter ?? {})
		if (expectedConfig.projection) cursor.project(expectedConfig.projection)
		if (expectedConfig.sort) cursor.sort(expectedConfig.sort as Record<string, 1 | -1>)
		if (expectedConfig.skip) cursor.skip(expectedConfig.skip)
		if (expectedConfig.limit) cursor.limit(expectedConfig.limit)
		expectedDocs = await cursor.toArray()

		// Handle scalar results (countDocuments)
		if (plan.operation === "countDocuments") {
			const passed = result === expectedDocs.length
			if (passed) {
				return c.json({
					success: true,
					result,
					feedback: `Correct! ${challenge.concept}`,
					xp: challenge.xp,
				})
			}
			return c.json({
				success: false,
				result,
				feedback: `Expected count of ${expectedDocs.length} but got ${result}`,
				error: null,
			})
		}

		// Handle findOne — wrap as array for comparison
		let actualDocs: unknown[]
		if (plan.operation === "findOne") {
			actualDocs = result !== null ? [result] : []
		} else {
			actualDocs = result as unknown[]
		}

		const compareResult = compareResults(actualDocs, expectedDocs, {
			orderSensitive: validation.orderSensitive,
			compareIds: validation.compareIds,
			subset: validation.subset,
		})

		if (compareResult.passed) {
			return c.json({
				success: true,
				result,
				feedback: `Correct! ${challenge.concept}`,
				xp: challenge.xp,
			})
		}

		return c.json({ success: false, result, feedback: compareResult.feedback, error: null })
	})

	return router
}

function getOperationFromQuery(query: string): string {
	// Quick extraction of operation from query string for reset check
	// Avoids full parse just to check if it's a write op
	const match = query.match(/\.(\w+)\s*\(/)
	if (!match) return "find"
	// Get the last method match (handles chaining like db.col.find())
	const methods = [...query.matchAll(/\.(\w+)\s*\(/g)]
	return methods.length >= 2 ? methods[1][1] : (methods[0]?.[1] ?? "find")
}
