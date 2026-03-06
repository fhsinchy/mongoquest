<script lang="ts">
import type { ProgressState } from "$lib/stores/progress.svelte"
import ProgressBar from "./ProgressBar.svelte"

interface Module {
	id: string
	name: string
	description: string
	challenges: { id: string; title: string; xp: number }[]
}

let {
	modules,
	coursepackId,
	progress,
	currentModuleId = "",
	currentChallengeId = "",
	collapsed = false,
	ontoggle,
}: {
	modules: Module[]
	coursepackId: string
	progress: ProgressState
	currentModuleId?: string
	currentChallengeId?: string
	collapsed?: boolean
	ontoggle?: () => void
} = $props()

function isModuleUnlocked(modIndex: number): boolean {
	if (modIndex === 0) return true
	const prevMod = modules[modIndex - 1]
	return prevMod.challenges.every(
		(ch) => progress.coursepacks[coursepackId]?.modules[prevMod.id]?.challenges[ch.id]?.completed,
	)
}

function getChallengeState(
	modIndex: number,
	modId: string,
	chId: string,
	chIndex: number,
): "locked" | "available" | "completed" | "current" {
	if (!isModuleUnlocked(modIndex)) return "locked"
	const completed = progress.coursepacks[coursepackId]?.modules[modId]?.challenges[chId]?.completed
	if (completed) return "completed"
	if (modId === currentModuleId && chId === currentChallengeId) return "current"

	// Check if all prior challenges in this module are completed
	const mod = modules[modIndex]
	for (let i = 0; i < chIndex; i++) {
		const prevCh = mod.challenges[i]
		if (!progress.coursepacks[coursepackId]?.modules[modId]?.challenges[prevCh.id]?.completed) {
			return "locked"
		}
	}
	return "available"
}

function getModuleCompletedCount(mod: Module): number {
	return mod.challenges.filter(
		(ch) => progress.coursepacks[coursepackId]?.modules[mod.id]?.challenges[ch.id]?.completed,
	).length
}
</script>

<aside
	class="h-full border-r border-border bg-deep flex flex-col transition-all duration-200"
	class:w-72={!collapsed}
	class:w-12={collapsed}
>
	<!-- Toggle button -->
	<button
		class="flex items-center justify-center h-10 border-b border-border text-muted hover:text-bright transition-colors cursor-pointer"
		onclick={() => ontoggle?.()}
		aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
	>
		<svg class="w-4 h-4 transition-transform" class:rotate-180={collapsed} viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
		</svg>
	</button>

	{#if !collapsed}
		<div class="flex-1 overflow-y-auto p-3 space-y-4">
			{#each modules as mod, modIndex}
				{@const unlocked = isModuleUnlocked(modIndex)}
				{@const completedCount = getModuleCompletedCount(mod)}
				<div class:opacity-40={!unlocked}>
					<div class="flex items-center gap-2 mb-1.5">
						{#if !unlocked}
							<svg class="w-3 h-3 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
							</svg>
						{/if}
						<span class="text-[10px] uppercase tracking-widest font-semibold text-muted truncate">
							{mod.name}
						</span>
					</div>

					<ProgressBar completed={completedCount} total={mod.challenges.length} />

					<div class="mt-2 space-y-0.5">
						{#each mod.challenges as ch, chIndex}
							{@const state = getChallengeState(modIndex, mod.id, ch.id, chIndex)}
							{#if state === "locked"}
								<div class="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted/50 cursor-not-allowed">
									<svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
									</svg>
									<span class="truncate">{ch.title}</span>
								</div>
							{:else}
								<a
									href="/learn/{coursepackId}/{mod.id}/{ch.id}"
									class="flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors {state === 'current' ? 'bg-emerald-dim/30 text-emerald-glow border border-emerald/30' : state === 'completed' ? 'text-emerald hover:bg-raised' : 'text-text hover:bg-raised'}"
								>
									{#if state === "completed"}
										<svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
										</svg>
									{:else if state === "current"}
										<div class="w-2 h-2 rounded-full bg-emerald shrink-0 animate-[pulse-glow_2s_ease-in-out_infinite]"></div>
									{:else}
										<div class="w-2 h-2 rounded-full bg-muted/40 shrink-0"></div>
									{/if}
									<span class="truncate">{ch.title}</span>
								</a>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</aside>
