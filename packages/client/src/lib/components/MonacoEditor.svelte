<script lang="ts">
import type * as Monaco from "monaco-editor"
import { onDestroy, onMount } from "svelte"

let {
	value = "",
	collections = [] as string[],
	onchange,
	onrun,
}: {
	value: string
	collections?: string[]
	onchange?: (val: string) => void
	onrun?: () => void
} = $props()

let containerEl: HTMLDivElement
let editor: Monaco.editor.IStandaloneCodeEditor | undefined
let monaco: typeof Monaco | undefined

onMount(async () => {
	// Configure Monaco workers before importing
	self.MonacoEnvironment = {
		getWorker(_: string, label: string) {
			if (label === "typescript" || label === "javascript") {
				return new Worker(
					new URL("monaco-editor/esm/vs/language/typescript/ts.worker.js", import.meta.url),
					{ type: "module" },
				)
			}
			return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), {
				type: "module",
			})
		},
	}

	monaco = await import("monaco-editor")

	monaco.editor.defineTheme("mongoquest", {
		base: "vs-dark",
		inherit: true,
		rules: [
			{ token: "comment", foreground: "64748b", fontStyle: "italic" },
			{ token: "keyword", foreground: "22d3ee" },
			{ token: "string", foreground: "34d399" },
			{ token: "number", foreground: "f59e0b" },
			{ token: "identifier", foreground: "cbd5e1" },
		],
		colors: {
			"editor.background": "#0f1520",
			"editor.foreground": "#cbd5e1",
			"editor.lineHighlightBackground": "#151d2b",
			"editor.selectionBackground": "#065f4680",
			"editorCursor.foreground": "#10b981",
			"editorLineNumber.foreground": "#232e42",
			"editorLineNumber.activeForeground": "#64748b",
			"editor.selectionHighlightBackground": "#065f4640",
			"editorWidget.background": "#151d2b",
			"editorWidget.border": "#232e42",
			"input.background": "#0a0e17",
			"input.border": "#232e42",
			focusBorder: "#10b981",
			"list.hoverBackground": "#1c2536",
			"list.activeSelectionBackground": "#065f46",
		},
	})

	editor = monaco.editor.create(containerEl, {
		value,
		language: "javascript",
		theme: "mongoquest",
		minimap: { enabled: false },
		lineNumbers: "on",
		fontSize: 14,
		fontFamily: "'IBM Plex Mono', monospace",
		wordWrap: "on",
		tabSize: 2,
		scrollBeyondLastLine: false,
		padding: { top: 12, bottom: 12 },
		renderLineHighlight: "line",
		cursorBlinking: "smooth",
		smoothScrolling: true,
		overviewRulerLanes: 0,
		hideCursorInOverviewRuler: true,
		overviewRulerBorder: false,
		scrollbar: {
			verticalScrollbarSize: 6,
			horizontalScrollbarSize: 6,
		},
		suggest: {
			showMethods: true,
			showFunctions: true,
			showKeywords: true,
		},
	})

	editor.onDidChangeModelContent(() => {
		onchange?.(editor!.getValue())
	})

	// Ctrl/Cmd+Enter to run
	editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
		onrun?.()
	})

	// Register db.collection autocomplete
	registerCompletions(monaco, collections)
})

function registerCompletions(m: typeof Monaco, cols: string[]) {
	const methods = [
		"find",
		"findOne",
		"countDocuments",
		"insertOne",
		"insertMany",
		"updateOne",
		"updateMany",
		"deleteOne",
		"deleteMany",
	]

	m.languages.registerCompletionItemProvider("javascript", {
		triggerCharacters: ["."],
		provideCompletionItems(model, position) {
			const textUntilPosition = model.getValueInRange({
				startLineNumber: position.lineNumber,
				startColumn: 1,
				endLineNumber: position.lineNumber,
				endColumn: position.column,
			})

			const word = model.getWordUntilPosition(position)
			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn,
			}

			// After "db." suggest collection names
			if (textUntilPosition.match(/db\.\s*$/)) {
				return {
					suggestions: cols.map((col) => ({
						label: col,
						kind: m.languages.CompletionItemKind.Field,
						insertText: col,
						range,
					})),
				}
			}

			// After "db.<collection>." suggest methods
			const colMatch = textUntilPosition.match(/db\.\w+\.\s*$/)
			if (colMatch) {
				return {
					suggestions: methods.map((method) => ({
						label: method,
						kind: m.languages.CompletionItemKind.Method,
						insertText: `${method}($0)`,
						insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						range,
					})),
				}
			}

			return { suggestions: [] }
		},
	})
}

onDestroy(() => {
	editor?.dispose()
})

export function getValue(): string {
	return editor?.getValue() ?? value
}
</script>

<div bind:this={containerEl} class="w-full h-full"></div>
