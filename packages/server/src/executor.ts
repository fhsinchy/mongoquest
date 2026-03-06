import { parse, type QueryPlan, translate } from "@mongoquest/shared"
import { getDb } from "./db"

const READ_OPERATIONS = new Set(["find", "findOne", "countDocuments"])
const QUERY_TIMEOUT_MS = 5000

export interface ExecutionResult {
	result: unknown
	plan: QueryPlan
}

export async function executeQuery(query: string, dbName: string): Promise<ExecutionResult> {
	const ast = parse(query)
	const plan = translate(ast)

	const isRead = READ_OPERATIONS.has(plan.operation)
	const db = await getDb(dbName, !isRead)
	const collection = db.collection(plan.collection)

	let result: unknown

	switch (plan.operation) {
		case "find": {
			let cursor = collection.find(plan.filter ?? {}, { maxTimeMS: QUERY_TIMEOUT_MS })
			if (plan.options.projection) cursor = cursor.project(plan.options.projection)
			if (plan.options.sort) cursor = cursor.sort(plan.options.sort as Record<string, 1 | -1>)
			if (plan.options.skip) cursor = cursor.skip(plan.options.skip)
			if (plan.options.limit) cursor = cursor.limit(plan.options.limit)
			result = await cursor.toArray()
			break
		}
		case "findOne": {
			result = await collection.findOne(plan.filter ?? {}, {
				projection: plan.options.projection,
				maxTimeMS: QUERY_TIMEOUT_MS,
			})
			break
		}
		case "countDocuments": {
			result = await collection.countDocuments(plan.filter ?? {}, {
				maxTimeMS: QUERY_TIMEOUT_MS,
			})
			break
		}
		case "insertOne": {
			result = await collection.insertOne(plan.document as any)
			break
		}
		case "insertMany": {
			result = await collection.insertMany(plan.documents as any[])
			break
		}
		case "updateOne": {
			result = await collection.updateOne(plan.filter ?? {}, plan.update as any)
			break
		}
		case "updateMany": {
			result = await collection.updateMany(plan.filter ?? {}, plan.update as any)
			break
		}
		case "deleteOne": {
			result = await collection.deleteOne(plan.filter ?? {})
			break
		}
		case "deleteMany": {
			result = await collection.deleteMany(plan.filter ?? {})
			break
		}
		default:
			throw new Error(`Unsupported operation: ${plan.operation}`)
	}

	return { result, plan }
}

export { READ_OPERATIONS }
