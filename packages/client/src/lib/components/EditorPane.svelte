<script lang="ts">
	import MonacoEditor from "./MonacoEditor.svelte"
	import OutputDisplay from "./OutputDisplay.svelte"

	let {
		starterCode = "",
		collections = [] as string[],
		result = null,
		success = false,
		feedback = null,
		error = null,
		loading = false,
		onrun,
	}: {
		starterCode: string
		collections?: string[]
		result: unknown
		success: boolean
		feedback: string | null
		error: string | null
		loading: boolean
		onrun: (query: string) => void
	} = $props()

	let editorRef: MonacoEditor | undefined
	let code = $state(starterCode)

	function handleRun() {
		const query = editorRef?.getValue() ?? code
		onrun(query)
	}
</script>

<div class="flex flex-col h-full">
	<!-- Editor -->
	<div class="flex items-center justify-between px-4 py-2 border-b border-border bg-deep">
		<span class="text-xs font-medium uppercase tracking-wider text-muted">Editor</span>
		<div class="flex items-center gap-3">
			<span class="text-[10px] text-muted hidden sm:block">Ctrl+Enter to run</span>
			<button
				class="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold
					bg-emerald text-void hover:bg-emerald-glow transition-colors cursor-pointer
					disabled:opacity-40 disabled:cursor-not-allowed"
				onclick={handleRun}
				disabled={loading}
			>
				<svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" clip-rule="evenodd"/>
				</svg>
				{loading ? "Running..." : "Run"}
			</button>
		</div>
	</div>

	<div class="flex-1 min-h-0 flex flex-col">
		<div class="flex-1 min-h-0">
			<MonacoEditor
				bind:this={editorRef}
				value={starterCode}
				{collections}
				onchange={(v) => (code = v)}
				onrun={handleRun}
			/>
		</div>

		<!-- Output -->
		<div class="h-[40%] min-h-[120px] border-t border-border bg-deep/50">
			<OutputDisplay {result} {success} {feedback} {error} {loading} />
		</div>
	</div>
</div>
