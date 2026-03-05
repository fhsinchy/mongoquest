<script lang="ts">
	import "../app.css"
	import { createProgressStore } from "$lib/stores/progress"
	import { setContext } from "svelte"

	let { children } = $props()

	const progressStore = createProgressStore()
	setContext("progress", progressStore)
</script>

<svelte:head>
	<title>MongoQuest</title>
</svelte:head>

<div class="h-screen flex flex-col bg-abyss">
	<!-- Nav bar -->
	<nav class="h-12 shrink-0 flex items-center justify-between px-4 border-b border-border bg-deep/80 backdrop-blur-sm z-50">
		<a href="/" class="flex items-center gap-2 group">
			<div class="w-6 h-6 rounded bg-emerald/20 border border-emerald/40 flex items-center justify-center group-hover:bg-emerald/30 transition-colors">
				<span class="text-emerald font-display font-bold text-xs">M</span>
			</div>
			<span class="font-display font-bold text-bright text-sm tracking-wide">MongoQuest</span>
		</a>

		<div class="flex items-center gap-4">
			<!-- XP counter -->
			<div class="flex items-center gap-1.5 text-xs">
				<svg class="w-3.5 h-3.5 text-amber" viewBox="0 0 20 20" fill="currentColor">
					<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
				</svg>
				<span class="font-semibold text-amber tabular-nums">{progressStore.state.totalXp}</span>
				<span class="text-muted">XP</span>
			</div>

			<!-- Streak badge -->
			{#if progressStore.state.streak.current > 0}
				<div class="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-dim/30 border border-amber/20">
					<span class="text-amber">&#x1F525;</span>
					<span class="font-semibold text-amber tabular-nums">{progressStore.state.streak.current}</span>
				</div>
			{/if}
		</div>
	</nav>

	<!-- Page content -->
	<main class="flex-1 min-h-0">
		{@render children()}
	</main>
</div>
