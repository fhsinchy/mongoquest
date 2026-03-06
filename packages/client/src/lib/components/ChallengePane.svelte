<script lang="ts">
let {
	title,
	description,
	concept,
	hint,
	xp,
	type,
}: {
	title: string
	description: string
	concept: string
	hint: string
	xp: number
	type: string
} = $props()

let showHint = $state(false)
</script>

<div class="flex flex-col h-full overflow-auto">
	<div class="p-5 space-y-4">
		<!-- Title + XP -->
		<div class="flex items-start justify-between gap-3">
			<h2 class="font-display text-xl font-bold text-bright leading-tight">{title}</h2>
			<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-dim/50 text-amber border border-amber/20">
				{xp} XP
			</span>
		</div>

		<!-- Type badge -->
		<div>
			<span class="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-semibold bg-surface border border-border text-muted">
				{type}
			</span>
		</div>

		<!-- Description -->
		<div class="text-sm leading-relaxed text-text space-y-2">
			{#each description.split("\n") as paragraph}
				{#if paragraph.trim()}
					<p>{paragraph}</p>
				{/if}
			{/each}
		</div>

		<!-- Concept -->
		<div class="rounded border border-cyan/20 bg-cyan/5 px-3 py-2">
			<span class="text-[10px] uppercase tracking-widest font-semibold text-cyan/70">Concept</span>
			<p class="mt-1 text-sm text-cyan/90">{concept}</p>
		</div>

		<!-- Hint toggle -->
		{#if hint}
			<button
				class="flex items-center gap-2 text-xs text-muted hover:text-amber transition-colors cursor-pointer"
				onclick={() => (showHint = !showHint)}
			>
				<svg class="w-3.5 h-3.5 transition-transform" class:rotate-90={showHint} viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
				</svg>
				{showHint ? "Hide hint" : "Show hint"}
			</button>

			{#if showHint}
				<div class="rounded border border-amber/20 bg-amber-dim/20 px-3 py-2 text-sm text-amber/80 animate-[fade-in_0.15s_ease-out]">
					{hint}
				</div>
			{/if}
		{/if}
	</div>
</div>
