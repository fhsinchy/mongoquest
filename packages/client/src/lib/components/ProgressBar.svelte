<script lang="ts">
	let { completed = 0, total = 1 }: { completed: number; total: number } = $props()
	let pct = $derived(total > 0 ? Math.round((completed / total) * 100) : 0)
</script>

<div class="flex items-center gap-3">
	<div class="flex-1 h-2 rounded-full bg-deep overflow-hidden border border-border">
		<div
			class="h-full rounded-full transition-all duration-500 ease-out"
			class:bg-emerald={pct > 0}
			class:shadow-[0_0_8px_var(--color-emerald-dim)]={pct > 0}
			style="width: {pct}%"
		></div>
	</div>
	<span class="text-xs font-medium text-muted tabular-nums w-10 text-right">{pct}%</span>
</div>
