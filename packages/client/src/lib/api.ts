import type { ProgressState } from "$lib/stores/progress.svelte"

interface ApiError {
	code: string
	message: string
}

class ApiRequestError extends Error {
	constructor(
		public status: number,
		public error: ApiError,
	) {
		super(error.message)
		this.name = "ApiRequestError"
	}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`/api${path}`, {
		headers: { "Content-Type": "application/json" },
		...options,
	})

	const data = await res.json()

	if (!res.ok) {
		throw new ApiRequestError(
			res.status,
			data.error ?? { code: "UNKNOWN", message: res.statusText },
		)
	}

	return data as T
}

interface CoursepackSummary {
	id: string
	name: string
	description: string
	difficulty: string
	estimatedHours: number
	moduleCount: number
	challengeCount: number
}

interface CoursepackDetail {
	id: string
	name: string
	description: string
	difficulty: string
	estimatedHours: number
	version: string
	author: string
	minMongoVersion: string
	database: { name: string; seedDir: string }
	modules: {
		id: string
		name: string
		description: string
		challenges: { id: string; title: string; xp: number }[]
	}[]
}

interface ChallengeDetail {
	id: string
	title: string
	description: string
	concept: string
	hint: string
	collection: string
	type: string
	starterCode: string
	xp: number
}

interface RunResult {
	success: boolean
	result: unknown
	feedback: string | null
	xp?: number
	error?: string | null
}

export const api = {
	async getCoursepacks() {
		const data = await request<{ coursepacks: CoursepackSummary[] }>("/coursepacks")
		return data.coursepacks
	},

	getCoursepack(id: string) {
		return request<CoursepackDetail>(`/coursepacks/${id}`)
	},

	seedCoursepack(id: string) {
		return request<{ success: boolean }>(`/coursepacks/${id}/seed`, { method: "POST" })
	},

	getChallenge(cpId: string, modId: string, chId: string) {
		return request<ChallengeDetail>(`/coursepacks/${cpId}/modules/${modId}/challenges/${chId}`)
	},

	runChallenge(cpId: string, modId: string, chId: string, query: string) {
		return request<RunResult>(`/coursepacks/${cpId}/modules/${modId}/challenges/${chId}/run`, {
			method: "POST",
			body: JSON.stringify({ query }),
		})
	},

	syncGistSave(token: string, progress: unknown, gistId?: string) {
		return request<{ success: boolean; gistId: string }>("/sync/gist/save", {
			method: "POST",
			body: JSON.stringify({ token, gistId, progress }),
		})
	},

	syncGistLoad(token: string, gistId: string) {
		return request<{ success: boolean; progress: ProgressState }>("/sync/gist/load", {
			method: "POST",
			body: JSON.stringify({ token, gistId }),
		})
	},
}

export type { ChallengeDetail, CoursepackDetail, CoursepackSummary, RunResult }
export { ApiRequestError }
