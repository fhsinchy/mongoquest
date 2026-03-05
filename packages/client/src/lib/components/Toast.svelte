<script lang="ts">
	interface ToastMessage {
		id: number
		text: string
		type: "success" | "error" | "info"
	}

	let messages = $state<ToastMessage[]>([])
	let nextId = 0

	export function show(text: string, type: ToastMessage["type"] = "info") {
		const id = nextId++
		messages = [...messages, { id, text, type }]
		setTimeout(() => {
			messages = messages.filter((m) => m.id !== id)
		}, 3500)
	}
</script>

{#if messages.length > 0}
	<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
		{#each messages as msg (msg.id)}
			<div
				class="px-4 py-3 rounded border text-sm font-medium animate-[fade-in_0.2s_ease-out]"
				class:bg-emerald-dim={msg.type === "success"}
				class:border-emerald={msg.type === "success"}
				class:text-emerald-glow={msg.type === "success"}
				class:bg-ruby-dim={msg.type === "error"}
				class:border-ruby={msg.type === "error"}
				class:text-ruby={msg.type === "error"}
				class:bg-surface={msg.type === "info"}
				class:border-border={msg.type === "info"}
				class:text-bright={msg.type === "info"}
			>
				{msg.text}
			</div>
		{/each}
	</div>
{/if}
