import { describe, expect, test } from "bun:test"
import {
	calculateStreak,
	mergeProgress,
	markChallengeComplete,
	isChallengeCompleted,
	defaultProgress,
	type ProgressState,
} from "../progress.svelte"

describe("calculateStreak", () => {
	test("returns 1 for first activity", () => {
		const result = calculateStreak(0, "", "2026-03-06")
		expect(result).toEqual({ current: 1, lastActiveDate: "2026-03-06" })
	})

	test("increments streak for consecutive days", () => {
		const result = calculateStreak(3, "2026-03-05", "2026-03-06")
		expect(result).toEqual({ current: 4, lastActiveDate: "2026-03-06" })
	})

	test("does not change streak for same day", () => {
		const result = calculateStreak(3, "2026-03-06", "2026-03-06")
		expect(result).toEqual({ current: 3, lastActiveDate: "2026-03-06" })
	})

	test("resets streak after gap", () => {
		const result = calculateStreak(5, "2026-03-03", "2026-03-06")
		expect(result).toEqual({ current: 1, lastActiveDate: "2026-03-06" })
	})
})

describe("mergeProgress", () => {
	test("keeps latest completedAt per challenge", () => {
		const local: ProgressState = {
			...defaultProgress(),
			coursepacks: {
				cp1: {
					modules: {
						mod1: {
							challenges: {
								ch1: { completed: true, completedAt: "2026-03-05T10:00:00Z" },
							},
						},
					},
				},
			},
			totalXp: 10,
		}
		const remote: ProgressState = {
			...defaultProgress(),
			coursepacks: {
				cp1: {
					modules: {
						mod1: {
							challenges: {
								ch1: { completed: true, completedAt: "2026-03-06T10:00:00Z" },
							},
						},
					},
				},
			},
			totalXp: 10,
		}

		const merged = mergeProgress(local, remote)
		expect(merged.coursepacks.cp1.modules.mod1.challenges.ch1.completedAt).toBe(
			"2026-03-06T10:00:00Z",
		)
	})

	test("includes challenges from both local and remote", () => {
		const local: ProgressState = {
			...defaultProgress(),
			coursepacks: {
				cp1: {
					modules: {
						mod1: {
							challenges: {
								ch1: { completed: true, completedAt: "2026-03-05T10:00:00Z" },
							},
						},
					},
				},
			},
			totalXp: 10,
		}
		const remote: ProgressState = {
			...defaultProgress(),
			coursepacks: {
				cp1: {
					modules: {
						mod1: {
							challenges: {
								ch2: { completed: true, completedAt: "2026-03-06T10:00:00Z" },
							},
						},
					},
				},
			},
			totalXp: 20,
		}

		const merged = mergeProgress(local, remote)
		const challenges = merged.coursepacks.cp1.modules.mod1.challenges
		expect(challenges.ch1).toBeDefined()
		expect(challenges.ch2).toBeDefined()
	})
})

describe("markChallengeComplete", () => {
	test("marks a challenge as completed with xp", () => {
		const state = defaultProgress()
		const updated = markChallengeComplete(state, "cp1", "mod1", "ch1", 10)
		expect(updated.coursepacks.cp1.modules.mod1.challenges.ch1.completed).toBe(true)
		expect(updated.totalXp).toBe(10)
	})

	test("skips if already completed", () => {
		const state = defaultProgress()
		const first = markChallengeComplete(state, "cp1", "mod1", "ch1", 10)
		const second = markChallengeComplete(first, "cp1", "mod1", "ch1", 10)
		expect(second.totalXp).toBe(10)
	})
})

describe("isChallengeCompleted", () => {
	test("returns false for uncompleted challenge", () => {
		expect(isChallengeCompleted(defaultProgress(), "cp1", "mod1", "ch1")).toBe(false)
	})

	test("returns true for completed challenge", () => {
		const state = markChallengeComplete(defaultProgress(), "cp1", "mod1", "ch1", 10)
		expect(isChallengeCompleted(state, "cp1", "mod1", "ch1")).toBe(true)
	})
})
