<script lang="ts">
	import { page } from "$app/state"
	import { goto } from "$app/navigation"
	import { getContext } from "svelte"
	import { api } from "$lib/api"
	import type { CoursepackDetail, ChallengeDetail } from "$lib/api"
	import type { ProgressState } from "$lib/stores/progress.svelte"
	import ChallengePane from "$lib/components/ChallengePane.svelte"
	import EditorPane from "$lib/components/EditorPane.svelte"
	import ModuleSidebar from "$lib/components/ModuleSidebar.svelte"

	const progressStore: {
		state: ProgressState
		complete: (cpId: string, modId: string, chId: string, xp: number) => void
		isCompleted: (cpId: string, modId: string, chId: string) => boolean
	} = getContext("progress")

	let coursepack = $state<CoursepackDetail | null>(null)
	let challenge = $state<ChallengeDetail | null>(null)
	let loadingCp = $state(true)
	let loadingCh = $state(true)
	let running = $state(false)
	let result = $state<unknown>(null)
	let success = $state(false)
	let feedback = $state<string | null>(null)
	let error = $state<string | null>(null)
	let sidebarCollapsed = $state(false)

	const cpId = $derived(page.params.coursepackId)
	const modId = $derived(page.params.moduleId)
	const chId = $derived(page.params.challengeId)

	// Load coursepack
	$effect(() => {
		loadingCp = true
		api.getCoursepack(cpId).then(
			(data) => {
				coursepack = data
				loadingCp = false
			},
			(err) => {
				error = err.message
				loadingCp = false
			},
		)
	})

	// Load challenge (reacts to chId changes)
	$effect(() => {
		loadingCh = true
		result = null
		success = false
		feedback = null
		error = null
		api.getChallenge(cpId, modId, chId).then(
			(data) => {
				challenge = data
				loadingCh = false
			},
			(err) => {
				error = err.message
				loadingCh = false
			},
		)
	})

	async function handleRun(query: string) {
		running = true
		result = null
		success = false
		feedback = null
		error = null

		try {
			const res = await api.runChallenge(cpId, modId, chId, query)
			result = res.result
			success = res.success
			feedback = res.feedback
			error = res.error ?? null

			if (res.success && res.xp) {
				progressStore.complete(cpId, modId, chId, res.xp)
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err)
		} finally {
			running = false
		}
	}

	function findNextChallenge(): string | null {
		if (!coursepack) return null
		const mod = coursepack.modules.find((m) => m.id === modId)
		if (!mod) return null

		const currentIdx = mod.challenges.findIndex((c) => c.id === chId)
		if (currentIdx < mod.challenges.length - 1) {
			return `/learn/${cpId}/${modId}/${mod.challenges[currentIdx + 1].id}`
		}

		// Next module's first challenge
		const modIdx = coursepack.modules.findIndex((m) => m.id === modId)
		if (modIdx < coursepack.modules.length - 1) {
			const nextMod = coursepack.modules[modIdx + 1]
			if (nextMod.challenges.length > 0) {
				return `/learn/${cpId}/${nextMod.id}/${nextMod.challenges[0].id}`
			}
		}

		return null
	}

	const collections = $derived(
		coursepack
			? [...new Set(coursepack.modules.flatMap((m) => m.challenges.map(() => challenge?.collection)).filter(Boolean))]
			: [],
	)
</script>

{#if loadingCp || loadingCh}
	<div class="flex items-center justify-center h-full">
		<div class="w-5 h-5 border-2 border-muted border-t-emerald rounded-full animate-spin"></div>
	</div>
{:else if challenge && coursepack}
	<div class="flex h-full">
		<!-- Sidebar -->
		<ModuleSidebar
			modules={coursepack.modules}
			coursepackId={cpId}
			progress={progressStore.state}
			currentModuleId={modId}
			currentChallengeId={chId}
			collapsed={sidebarCollapsed}
			ontoggle={() => (sidebarCollapsed = !sidebarCollapsed)}
		/>

		<!-- Split pane: Challenge info | Editor + Output -->
		<div class="flex-1 min-w-0 flex">
			<!-- Left: Challenge description -->
			<div class="w-[340px] shrink-0 border-r border-border bg-surface/30 overflow-hidden">
				<ChallengePane
					title={challenge.title}
					description={challenge.description}
					concept={challenge.concept}
					hint={challenge.hint}
					xp={challenge.xp}
					type={challenge.type}
				/>
			</div>

			<!-- Right: Editor + Output -->
			<div class="flex-1 min-w-0 flex flex-col">
				<EditorPane
					starterCode={challenge.starterCode}
					collections={collections as string[]}
					{result}
					{success}
					{feedback}
					error={error}
					loading={running}
					onrun={handleRun}
				/>

				<!-- Next challenge bar -->
				{#if success}
					<div class="shrink-0 flex items-center justify-between px-4 py-2 border-t border-emerald/30 bg-emerald-dim/10 animate-[fade-in_0.2s_ease-out]">
						<span class="text-xs text-emerald-glow font-medium">
							+{challenge.xp} XP earned!
						</span>
						{#if findNextChallenge()}
							<a
								href={findNextChallenge()}
								class="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-emerald text-void hover:bg-emerald-glow transition-colors"
							>
								Next Challenge &rarr;
							</a>
						{:else}
							<a
								href="/learn/{cpId}"
								class="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border border-emerald/30 text-emerald hover:bg-emerald-dim/20 transition-colors"
							>
								Back to Overview
							</a>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center h-full">
		<div class="rounded border border-ruby bg-ruby-dim/20 px-4 py-3 text-ruby text-sm">
			{error}
		</div>
	</div>
{/if}
