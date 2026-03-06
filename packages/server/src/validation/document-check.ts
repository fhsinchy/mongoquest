import type { Db } from "mongodb"
import type { ValidationResult } from "./output-match"

interface CountCheck {
	type: "count"
	collection: string
	filter: Record<string, unknown>
	expected: number
}

interface ExistsCheck {
	type: "exists"
	collection: string
	filter: Record<string, unknown>
}

interface NotExistsCheck {
	type: "notExists"
	collection: string
	filter: Record<string, unknown>
}

interface FieldEqualsCheck {
	type: "fieldEquals"
	collection: string
	filter: Record<string, unknown>
	field: string
	expected: unknown
}

type DocumentCheck = CountCheck | ExistsCheck | NotExistsCheck | FieldEqualsCheck

export async function runDocumentChecks(
	db: Db,
	checks: DocumentCheck[],
): Promise<ValidationResult> {
	for (const check of checks) {
		const collection = db.collection(check.collection)

		switch (check.type) {
			case "count": {
				const count = await collection.countDocuments(check.filter)
				if (count !== check.expected) {
					return {
						passed: false,
						feedback: `Expected ${check.expected} document(s) matching filter in '${check.collection}', but found ${count}`,
					}
				}
				break
			}
			case "exists": {
				const doc = await collection.findOne(check.filter)
				if (!doc) {
					return {
						passed: false,
						feedback: `Expected a document matching filter in '${check.collection}', but none found`,
					}
				}
				break
			}
			case "notExists": {
				const doc = await collection.findOne(check.filter)
				if (doc) {
					return {
						passed: false,
						feedback: `Expected no document matching filter in '${check.collection}', but one was found`,
					}
				}
				break
			}
			case "fieldEquals": {
				const doc = await collection.findOne(check.filter)
				if (!doc) {
					return {
						passed: false,
						feedback: `No document matching filter in '${check.collection}'`,
					}
				}
				if (doc[check.field] !== check.expected) {
					return {
						passed: false,
						feedback: `Expected '${check.field}' to be ${JSON.stringify(check.expected)}, but got ${JSON.stringify(doc[check.field])}`,
					}
				}
				break
			}
		}
	}

	return { passed: true, feedback: "All document checks passed" }
}
