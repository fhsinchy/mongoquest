<script lang="ts">
let {
	result = null,
	success = false,
	feedback = null,
	error = null,
	loading = false,
}: {
	result: unknown
	success: boolean
	feedback: string | null
	error: string | null
	loading: boolean
} = $props()

let formattedResult = $derived(
	result !== null && result !== undefined ? JSON.stringify(result, null, 2) : null,
)
</script>

<div class="flex flex-col h-full">
	<div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-deep">
		<div class="w-2 h-2 rounded-full" class:bg-emerald={success} class:bg-ruby={!success && feedback !== null} class:bg-muted={feedback === null}></div>
		<span class="text-xs font-medium uppercase tracking-wider text-muted">Output</span>
	</div>

	<div class="flex-1 overflow-auto p-4 font-mono text-sm">
		{#if loading}
			<div class="flex items-center gap-2 text-muted">
				<div class="w-3 h-3 border-2 border-muted border-t-emerald rounded-full animate-spin"></div>
				<span>Executing query...</span>
			</div>
		{:else if error}
			<div class="rounded border border-ruby bg-ruby-dim/30 px-3 py-2 text-ruby">
				<span class="text-xs uppercase tracking-wider opacity-70">Error</span>
				<pre class="mt-1 whitespace-pre-wrap text-sm">{error}</pre>
			</div>
		{:else if feedback !== null}
			<div
				class="rounded border px-3 py-2 mb-3 {success ? 'border-emerald bg-emerald-dim/20 text-emerald-glow' : 'border-ruby bg-ruby-dim/20 text-ruby'}"
			>
				<div class="flex items-center gap-2">
					{#if success}
						<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
						</svg>
					{:else}
						<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					{/if}
					<span class="text-sm font-medium">{feedback}</span>
				</div>
			</div>
		{:else}
			<span class="text-muted text-xs italic">Run a query to see results here.</span>
		{/if}

		{#if formattedResult !== null && !loading}
			<pre class="mt-2 text-text whitespace-pre-wrap text-xs leading-relaxed bg-void/50 rounded p-3 border border-border">{formattedResult}</pre>
		{/if}
	</div>
</div>
