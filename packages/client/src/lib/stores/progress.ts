export interface ChallengeProgress {
	completed: boolean
	completedAt: string
}

export interface ProgressState {
	coursepacks: {
		[cpId: string]: {
			modules: {
				[modId: string]: {
					challenges: {
						[chId: string]: ChallengeProgress
					}
				}
			}
		}
	}
	totalXp: number
	streak: { current: number; lastActiveDate: string }
}

const STORAGE_KEY = "mongoquest_progress"

export function defaultProgress(): ProgressState {
	return {
		coursepacks: {},
		totalXp: 0,
		streak: { current: 0, lastActiveDate: "" },
	}
}

export function loadProgress(): ProgressState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return defaultProgress()
		return JSON.parse(raw) as ProgressState
	} catch {
		return defaultProgress()
	}
}

export function saveProgress(state: ProgressState): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function calculateStreak(
	currentStreak: number,
	lastActiveDate: string,
	today: string,
): { current: number; lastActiveDate: string } {
	if (!lastActiveDate) {
		return { current: 1, lastActiveDate: today }
	}
	if (lastActiveDate === today) {
		return { current: currentStreak, lastActiveDate: today }
	}

	const last = new Date(lastActiveDate)
	const now = new Date(today)
	const diffMs = now.getTime() - last.getTime()
	const diffDays = diffMs / (1000 * 60 * 60 * 24)

	if (diffDays === 1) {
		return { current: currentStreak + 1, lastActiveDate: today }
	}
	return { current: 1, lastActiveDate: today }
}

export function markChallengeComplete(
	state: ProgressState,
	cpId: string,
	modId: string,
	chId: string,
	xp: number,
): ProgressState {
	if (isChallengeCompleted(state, cpId, modId, chId)) {
		return state
	}

	const now = new Date().toISOString()
	const coursepacks = { ...state.coursepacks }
	const cp = coursepacks[cpId] ?? { modules: {} }
	const modules = { ...cp.modules }
	const mod = modules[modId] ?? { challenges: {} }
	const challenges = { ...mod.challenges }

	challenges[chId] = { completed: true, completedAt: now }
	modules[modId] = { challenges }
	coursepacks[cpId] = { modules }

	return {
		coursepacks,
		totalXp: state.totalXp + xp,
		streak: state.streak,
	}
}

export function isChallengeCompleted(
	state: ProgressState,
	cpId: string,
	modId: string,
	chId: string,
): boolean {
	return state.coursepacks[cpId]?.modules[modId]?.challenges[chId]?.completed === true
}

export function mergeProgress(local: ProgressState, remote: ProgressState): ProgressState {
	const merged = defaultProgress()
	const allCpIds = new Set([...Object.keys(local.coursepacks), ...Object.keys(remote.coursepacks)])

	let totalXp = 0

	for (const cpId of allCpIds) {
		const localCp = local.coursepacks[cpId]
		const remoteCp = remote.coursepacks[cpId]
		const allModIds = new Set([
			...Object.keys(localCp?.modules ?? {}),
			...Object.keys(remoteCp?.modules ?? {}),
		])

		merged.coursepacks[cpId] = { modules: {} }

		for (const modId of allModIds) {
			const localMod = localCp?.modules[modId]
			const remoteMod = remoteCp?.modules[modId]
			const allChIds = new Set([
				...Object.keys(localMod?.challenges ?? {}),
				...Object.keys(remoteMod?.challenges ?? {}),
			])

			merged.coursepacks[cpId].modules[modId] = { challenges: {} }

			for (const chId of allChIds) {
				const localCh = localMod?.challenges[chId]
				const remoteCh = remoteMod?.challenges[chId]

				let winner: ChallengeProgress
				if (localCh && remoteCh) {
					winner = localCh.completedAt >= remoteCh.completedAt ? localCh : remoteCh
				} else {
					winner = (localCh ?? remoteCh)!
				}

				merged.coursepacks[cpId].modules[modId].challenges[chId] = winner
				if (winner.completed) totalXp += 10
			}
		}
	}

	merged.totalXp = totalXp
	merged.streak =
		local.streak.lastActiveDate >= remote.streak.lastActiveDate ? local.streak : remote.streak

	return merged
}

export function createProgressStore() {
	let state = $state<ProgressState>(loadProgress())

	return {
		get state() {
			return state
		},
		complete(cpId: string, modId: string, chId: string, xp: number) {
			const today = new Date().toISOString().split("T")[0]
			state = markChallengeComplete(state, cpId, modId, chId, xp)
			state = {
				...state,
				streak: calculateStreak(state.streak.current, state.streak.lastActiveDate, today),
			}
			saveProgress(state)
		},
		isCompleted(cpId: string, modId: string, chId: string) {
			return isChallengeCompleted(state, cpId, modId, chId)
		},
		sync(remote: ProgressState) {
			state = mergeProgress(state, remote)
			saveProgress(state)
		},
		reset() {
			state = defaultProgress()
			saveProgress(state)
		},
	}
}
