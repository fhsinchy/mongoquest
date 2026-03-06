<script lang="ts">
import { getContext } from "svelte"
import { api } from "$lib/api"
import type { ProgressState } from "$lib/stores/progress.svelte"

const TOKEN_KEY = "mongoquest_gist_token"
const GIST_ID_KEY = "mongoquest_gist_id"

const progressStore: {
	state: ProgressState
	sync: (remote: ProgressState) => void
} = getContext("progress")

let open = $state(false)
let token = $state(localStorage.getItem(TOKEN_KEY) ?? "")
let gistId = $state(localStorage.getItem(GIST_ID_KEY) ?? "")
let saving = $state(false)
let loading = $state(false)
let status = $state<{ type: "success" | "error"; message: string } | null>(null)
let statusTimeout: ReturnType<typeof setTimeout> | undefined

function persistSettings() {
	localStorage.setItem(TOKEN_KEY, token)
	localStorage.setItem(GIST_ID_KEY, gistId)
}

function showStatus(type: "success" | "error", message: string) {
	clearTimeout(statusTimeout)
	status = { type, message }
	statusTimeout = setTimeout(() => (status = null), 4000)
}

async function handleSave() {
	saving = true
	status = null
	try {
		persistSettings()
		const res = await api.syncGistSave(token, progressStore.state, gistId || undefined)
		if (res.gistId && res.gistId !== gistId) {
			gistId = res.gistId
			localStorage.setItem(GIST_ID_KEY, gistId)
		}
		showStatus("success", "Saved!")
	} catch (err) {
		showStatus("error", err instanceof Error ? err.message : "Save failed")
	} finally {
		saving = false
	}
}

async function handleLoad() {
	if (!gistId) return
	loading = true
	status = null
	try {
		persistSettings()
		const res = await api.syncGistLoad(token, gistId)
		progressStore.sync(res.progress)
		showStatus("success", "Synced!")
	} catch (err) {
		showStatus("error", err instanceof Error ? err.message : "Load failed")
	} finally {
		loading = false
	}
}

function handleClickOutside(e: MouseEvent) {
	const target = e.target as HTMLElement
	if (!target.closest("[data-sync-dropdown]")) {
		open = false
	}
}
</script>

<svelte:document onclick={handleClickOutside} />

<div class="relative" data-sync-dropdown>
	<button
		class="flex items-center justify-center w-7 h-7 rounded hover:bg-raised transition-colors cursor-pointer"
		onclick={() => (open = !open)}
		aria-label="Sync progress"
	>
		<span class="text-sm">&#x1F504;</span>
	</button>

	{#if open}
		<div class="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-surface shadow-xl z-50 animate-[fade-in_0.15s_ease-out]">
			<div class="px-4 py-3 border-b border-border">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-bright">Gist Sync</h3>
				<p class="text-[10px] text-muted mt-0.5">Sync progress via GitHub Gist</p>
			</div>

			<div class="px-4 py-3 space-y-3">
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="gist-token" class="text-[10px] uppercase tracking-wider text-muted font-medium">GitHub Token</label>
						<a
							href="https://github.com/settings/tokens/new?scopes=gist&description=MongoQuest"
							target="_blank"
							rel="noopener noreferrer"
							class="text-[10px] text-emerald hover:text-emerald-glow transition-colors"
						>
							Create token
						</a>
					</div>
					<input
						id="gist-token"
						type="password"
						bind:value={token}
						placeholder="ghp_..."
						class="w-full px-2.5 py-1.5 rounded border border-border bg-deep text-xs text-text placeholder:text-muted/50 focus:outline-none focus:border-emerald/40 transition-colors"
					/>
				</div>

				<div>
					<label for="gist-id" class="text-[10px] uppercase tracking-wider text-muted font-medium block mb-1">Gist ID</label>
					<input
						id="gist-id"
						type="text"
						bind:value={gistId}
						placeholder="Auto-created on first save"
						class="w-full px-2.5 py-1.5 rounded border border-border bg-deep text-xs text-text placeholder:text-muted/50 focus:outline-none focus:border-emerald/40 transition-colors"
					/>
				</div>

				<div class="flex gap-2">
					<button
						onclick={handleSave}
						disabled={!token || saving || loading}
						class="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-emerald text-void hover:bg-emerald-glow transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{saving ? "Saving..." : "Save"}
					</button>
					<button
						onclick={handleLoad}
						disabled={!token || !gistId || saving || loading}
						class="flex-1 px-3 py-1.5 rounded text-xs font-semibold border border-emerald/30 text-emerald hover:bg-emerald-dim/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{loading ? "Loading..." : "Load"}
					</button>
				</div>

				{#if status}
					<div
						class="text-[11px] text-center py-1 rounded {status.type === 'success'
							? 'text-emerald'
							: 'text-ruby'}"
					>
						{status.message}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
