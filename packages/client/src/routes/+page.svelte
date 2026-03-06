<script lang="ts">
import type { CoursepackSummary } from "$lib/api"
import { api } from "$lib/api"

let coursepacks = $state<CoursepackSummary[]>([])
let loading = $state(true)
let error = $state<string | null>(null)

$effect(() => {
	api.getCoursepacks().then(
		(data) => {
			coursepacks = data
			loading = false
		},
		(err) => {
			error = err.message
			loading = false
		},
	)
})

const difficultyColor: Record<string, string> = {
	beginner: "text-emerald border-emerald/20 bg-emerald-dim/30",
	intermediate: "text-amber border-amber/20 bg-amber-dim/30",
	advanced: "text-ruby border-ruby/20 bg-ruby-dim/30",
}
</script>

<div class="h-full overflow-auto">
	<div class="max-w-4xl mx-auto px-6 py-16">
		<!-- Hero -->
		<div class="mb-16 animate-[fade-in_0.4s_ease-out]">
			<div class="flex items-center gap-2 mb-4">
				<div class="h-px flex-1 bg-gradient-to-r from-emerald/40 to-transparent"></div>
				<span class="text-[10px] uppercase tracking-[0.25em] text-emerald/60 font-semibold">Learn MongoDB</span>
				<div class="h-px flex-1 bg-gradient-to-l from-emerald/40 to-transparent"></div>
			</div>

			<h1 class="font-display text-4xl md:text-5xl font-bold text-bright text-center leading-tight">
				Master MongoDB<br />
				<span class="text-emerald">One Query at a Time</span>
			</h1>

			<p class="mt-4 text-center text-muted text-sm max-w-md mx-auto leading-relaxed">
				Interactive challenges that teach you MongoDB through hands-on practice.
				Write real queries, get instant feedback, level up your skills.
			</p>
		</div>

		<!-- Coursepacks -->
		{#if loading}
			<div class="flex justify-center">
				<div class="w-5 h-5 border-2 border-muted border-t-emerald rounded-full animate-spin"></div>
			</div>
		{:else if error}
			<div class="rounded border border-ruby bg-ruby-dim/20 px-4 py-3 text-ruby text-sm text-center">
				{error}
			</div>
		{:else if coursepacks.length === 0}
			<div class="text-center text-muted text-sm">
				<p>No coursepacks available.</p>
				<p class="mt-1 text-xs">Seed a coursepack from the server to get started.</p>
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				{#each coursepacks as cp, i}
					<a
						href="/learn/{cp.id}"
						class="group block rounded-lg border border-border bg-surface/50 p-5 hover:border-emerald/30 hover:bg-surface transition-all duration-200 animate-[fade-in_0.3s_ease-out]"
						style="animation-delay: {i * 80}ms; animation-fill-mode: both;"
					>
						<div class="flex items-start justify-between gap-3 mb-3">
							<h2 class="font-display text-lg font-bold text-bright group-hover:text-emerald-glow transition-colors">
								{cp.name}
							</h2>
							<span class="shrink-0 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border {difficultyColor[cp.difficulty] ?? 'text-muted border-border'}">
								{cp.difficulty}
							</span>
						</div>

						<p class="text-xs text-muted leading-relaxed mb-4">{cp.description}</p>

						<div class="flex items-center gap-4 text-[10px] uppercase tracking-wider text-muted">
							<span>{cp.moduleCount} modules</span>
							<span class="w-1 h-1 rounded-full bg-border"></span>
							<span>{cp.challengeCount} challenges</span>
							<span class="w-1 h-1 rounded-full bg-border"></span>
							<span>{cp.estimatedHours}h</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
