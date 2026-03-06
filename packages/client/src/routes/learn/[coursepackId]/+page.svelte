<script lang="ts">
import { getContext } from "svelte"
import { page } from "$app/state"
import type { CoursepackDetail } from "$lib/api"
import { api } from "$lib/api"
import ProgressBar from "$lib/components/ProgressBar.svelte"
import type { ProgressState } from "$lib/stores/progress.svelte"

const progressStore: { state: ProgressState } = getContext("progress")

let coursepack = $state<CoursepackDetail | null>(null)
let loading = $state(true)
let error = $state<string | null>(null)
let seeding = $state(false)

const coursepackId = $derived(page.params.coursepackId)

$effect(() => {
	loading = true
	api.getCoursepack(coursepackId).then(
		(data) => {
			coursepack = data
			loading = false
		},
		(err) => {
			error = err.message
			loading = false
		},
	)
})

async function handleSeed() {
	seeding = true
	try {
		await api.seedCoursepack(coursepackId)
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	} finally {
		seeding = false
	}
}

function isModuleUnlocked(modIndex: number): boolean {
	if (!coursepack || modIndex === 0) return true
	const prevMod = coursepack.modules[modIndex - 1]
	return prevMod.challenges.every(
		(ch) =>
			progressStore.state.coursepacks[coursepackId]?.modules[prevMod.id]?.challenges[ch.id]
				?.completed,
	)
}

function isChallengeAvailable(modIndex: number, chIndex: number): boolean {
	if (!isModuleUnlocked(modIndex)) return false
	if (chIndex === 0) return true
	const mod = coursepack!.modules[modIndex]
	const prevCh = mod.challenges[chIndex - 1]
	return (
		progressStore.state.coursepacks[coursepackId]?.modules[mod.id]?.challenges[prevCh.id]
			?.completed === true
	)
}

function isChallengeCompleted(modId: string, chId: string): boolean {
	return (
		progressStore.state.coursepacks[coursepackId]?.modules[modId]?.challenges[chId]?.completed ===
		true
	)
}

function getModuleCompletedCount(mod: CoursepackDetail["modules"][number]): number {
	return mod.challenges.filter((ch) => isChallengeCompleted(mod.id, ch.id)).length
}

function findFirstAvailable(): string | null {
	if (!coursepack) return null
	for (let mi = 0; mi < coursepack.modules.length; mi++) {
		if (!isModuleUnlocked(mi)) continue
		const mod = coursepack.modules[mi]
		for (let ci = 0; ci < mod.challenges.length; ci++) {
			if (!isChallengeCompleted(mod.id, mod.challenges[ci].id) && isChallengeAvailable(mi, ci)) {
				return `/learn/${coursepackId}/${mod.id}/${mod.challenges[ci].id}`
			}
		}
	}
	return null
}
</script>

<div class="h-full overflow-auto">
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<div class="w-5 h-5 border-2 border-muted border-t-emerald rounded-full animate-spin"></div>
		</div>
	{:else if error}
		<div class="max-w-2xl mx-auto px-6 py-12">
			<div class="rounded border border-ruby bg-ruby-dim/20 px-4 py-3 text-ruby text-sm">
				{error}
			</div>
		</div>
	{:else if coursepack}
		<div class="max-w-3xl mx-auto px-6 py-10">
			<!-- Header -->
			<div class="mb-8 animate-[fade-in_0.3s_ease-out]">
				<a href="/" class="text-xs text-muted hover:text-bright transition-colors mb-3 inline-block">&larr; All Coursepacks</a>
				<h1 class="font-display text-3xl font-bold text-bright">{coursepack.name}</h1>
				<p class="mt-2 text-sm text-muted leading-relaxed">{coursepack.description}</p>

				<div class="flex items-center gap-3 mt-4">
					<button
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald text-void hover:bg-emerald-glow transition-colors cursor-pointer disabled:opacity-40"
						onclick={handleSeed}
						disabled={seeding}
					>
						{seeding ? "Seeding..." : "Seed Database"}
					</button>

					{#if findFirstAvailable()}
						<a
							href={findFirstAvailable()}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border border-emerald/30 text-emerald hover:bg-emerald-dim/20 transition-colors"
						>
							Continue &rarr;
						</a>
					{/if}
				</div>
			</div>

			<!-- Modules -->
			<div class="space-y-6">
				{#each coursepack.modules as mod, modIndex}
					{@const unlocked = isModuleUnlocked(modIndex)}
					{@const completedCount = getModuleCompletedCount(mod)}
					<div
						class="rounded-lg border bg-surface/30 p-5 animate-[fade-in_0.3s_ease-out] {unlocked ? 'border-border' : 'border-border/40 opacity-50'}"
						style="animation-delay: {modIndex * 60}ms; animation-fill-mode: both;"
					>
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-2">
								{#if !unlocked}
									<svg class="w-3.5 h-3.5 text-muted" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
									</svg>
								{/if}
								<h3 class="font-display text-base font-semibold text-bright">{mod.name}</h3>
							</div>
							<span class="text-[10px] text-muted tabular-nums">{completedCount}/{mod.challenges.length}</span>
						</div>

						<p class="text-xs text-muted mb-3">{mod.description}</p>

						<ProgressBar completed={completedCount} total={mod.challenges.length} />

						{#if unlocked}
							<div class="mt-3 grid gap-1.5">
								{#each mod.challenges as ch, chIndex}
									{@const completed = isChallengeCompleted(mod.id, ch.id)}
									{@const available = isChallengeAvailable(modIndex, chIndex)}
									{#if available || completed}
										<a
											href="/learn/{coursepackId}/{mod.id}/{ch.id}"
											class="flex items-center justify-between gap-2 px-3 py-2 rounded text-xs transition-colors hover:bg-raised group"
											class:text-emerald={completed}
											class:text-text={!completed}
										>
											<div class="flex items-center gap-2">
												{#if completed}
													<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
													</svg>
												{:else}
													<div class="w-2.5 h-2.5 rounded-full border border-muted/50 group-hover:border-emerald/50 transition-colors"></div>
												{/if}
												<span>{ch.title}</span>
											</div>
											<span class="text-[10px] text-muted">{ch.xp} XP</span>
										</a>
									{:else}
										<div class="flex items-center gap-2 px-3 py-2 rounded text-xs text-muted/40 cursor-not-allowed">
											<svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
											</svg>
											<span>{ch.title}</span>
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
