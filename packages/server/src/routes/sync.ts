import { Hono } from "hono"

const GIST_API = "https://api.github.com/gists"
const FILENAME = "mongoquest-progress.json"

const syncRouter = new Hono()

syncRouter.post("/gist/save", async (c) => {
	const body = await c.req.json().catch(() => null)
	if (!body?.token || !body?.progress) {
		return c.json(
			{ error: { code: "INVALID_REQUEST", message: "Request must include 'token' and 'progress'" } },
			400,
		)
	}

	const { token, gistId, progress } = body
	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"Content-Type": "application/json",
		"X-GitHub-Api-Version": "2022-11-28",
	}

	const payload = {
		description: "MongoQuest Progress",
		public: false,
		files: {
			[FILENAME]: {
				content: JSON.stringify(progress, null, 2),
			},
		},
	}

	const url = gistId ? `${GIST_API}/${gistId}` : GIST_API
	const method = gistId ? "PATCH" : "POST"

	const response = await fetch(url, { method, headers, body: JSON.stringify(payload) })

	if (!response.ok) {
		const err = await response.text()
		return c.json(
			{ error: { code: "GIST_API_ERROR", message: `GitHub API error: ${response.status}`, details: err } },
			response.status as 400,
		)
	}

	const gist = (await response.json()) as { id: string }
	return c.json({ success: true, gistId: gist.id })
})

syncRouter.post("/gist/load", async (c) => {
	const body = await c.req.json().catch(() => null)
	if (!body?.token || !body?.gistId) {
		return c.json(
			{ error: { code: "INVALID_REQUEST", message: "Request must include 'token' and 'gistId'" } },
			400,
		)
	}

	const { token, gistId } = body
	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	}

	const response = await fetch(`${GIST_API}/${gistId}`, { headers })

	if (!response.ok) {
		const err = await response.text()
		return c.json(
			{ error: { code: "GIST_API_ERROR", message: `GitHub API error: ${response.status}`, details: err } },
			response.status as 400,
		)
	}

	const gist = (await response.json()) as { files: Record<string, { content: string }> }
	const file = gist.files[FILENAME]
	if (!file) {
		return c.json(
			{ error: { code: "PROGRESS_NOT_FOUND", message: "No MongoQuest progress found in this Gist" } },
			404,
		)
	}

	const progress = JSON.parse(file.content)
	return c.json({ success: true, progress })
})

export { syncRouter }
