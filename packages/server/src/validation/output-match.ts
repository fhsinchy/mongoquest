export interface CompareOptions {
	orderSensitive?: boolean
	compareIds?: boolean
	subset?: boolean
}

export interface ValidationResult {
	passed: boolean
	feedback: string
}

export function compareResults(
	actual: unknown[],
	expected: unknown[],
	options: CompareOptions = {},
): ValidationResult {
	const { orderSensitive = false, compareIds = false, subset = false } = options

	const cleanActual = actual.map((doc) => stripFields(doc, compareIds))
	const cleanExpected = expected.map((doc) => stripFields(doc, compareIds))

	if (!subset && cleanActual.length !== cleanExpected.length) {
		return {
			passed: false,
			feedback: `Expected ${cleanExpected.length} document(s) but got ${cleanActual.length}`,
		}
	}

	if (subset) {
		for (const exp of cleanExpected) {
			if (!cleanActual.some((act) => deepEqual(act, exp))) {
				return {
					passed: false,
					feedback: `Expected document not found in results: ${JSON.stringify(exp)}`,
				}
			}
		}
		return { passed: true, feedback: "Results contain all expected documents" }
	}

	if (orderSensitive) {
		for (let i = 0; i < cleanExpected.length; i++) {
			if (!deepEqual(cleanActual[i], cleanExpected[i])) {
				return {
					passed: false,
					feedback: `Document at index ${i} does not match expected`,
				}
			}
		}
		return { passed: true, feedback: "All documents match in order" }
	}

	const sortedActual = sortDeterministic(cleanActual)
	const sortedExpected = sortDeterministic(cleanExpected)

	for (let i = 0; i < sortedExpected.length; i++) {
		if (!deepEqual(sortedActual[i], sortedExpected[i])) {
			return {
				passed: false,
				feedback: "Documents do not match expected results",
			}
		}
	}

	return { passed: true, feedback: "All documents match" }
}

function stripFields(doc: unknown, keepId: boolean): unknown {
	if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return doc
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
		if (key === "_id" && !keepId) continue
		result[key] = value
	}
	return result
}

function sortDeterministic(arr: unknown[]): unknown[] {
	return [...arr].sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)))
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value)
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
	const sorted = Object.keys(value as Record<string, unknown>).sort()
	const pairs = sorted.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
	return `{${pairs.join(",")}}`
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (a === null || b === null) return false
	if (typeof a !== typeof b) return false

	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return false
		if (a.length !== b.length) return false
		return a.every((val, i) => deepEqual(val, b[i]))
	}

	if (typeof a === "object") {
		const aObj = a as Record<string, unknown>
		const bObj = b as Record<string, unknown>
		const aKeys = Object.keys(aObj)
		const bKeys = Object.keys(bObj)
		if (aKeys.length !== bKeys.length) return false
		return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
	}

	return false
}
