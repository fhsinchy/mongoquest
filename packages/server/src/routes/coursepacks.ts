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
		const result = await seedCoursepack(cp)
		return c.json({ success: true, ...result })
	})

	// Get module
	router.get("/:id/modules/:moduleId", (c) => {
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
		return c.json({
			...mod.meta,
			challenges: mod.challenges.map((ch) => ({ id: ch.id, title: ch.title, xp: ch.xp })),
		})
	})

	// Get challenge (excludes validation)
	router.get("/:id/modules/:moduleId/challenges/:challengeId", (c) => {
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
		// Exclude validation from response
		const { validation, ...publicChallenge } = challenge
		return c.json(publicChallenge)
	})

	return router
}
