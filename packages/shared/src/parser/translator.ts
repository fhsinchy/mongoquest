import type { MongoshAST } from "./types"

export interface QueryPlan {
	collection: string
	operation: string
	filter?: Record<string, unknown>
	document?: unknown
	documents?: unknown[]
	update?: Record<string, unknown>
	options: {
		sort?: Record<string, number>
		limit?: number
		skip?: number
		projection?: Record<string, number>
	}
}

export function translate(ast: MongoshAST): QueryPlan {
	const plan: QueryPlan = {
		collection: ast.collection,
		operation: ast.method,
		options: {},
	}

	switch (ast.method) {
		case "find":
		case "findOne":
		case "countDocuments":
			plan.filter = (ast.args[0] as Record<string, unknown>) ?? {}
			if (ast.args[1]) {
				plan.options.projection = ast.args[1] as Record<string, number>
			}
			break

		case "insertOne":
			plan.document = ast.args[0]
			break

		case "insertMany":
			plan.documents = ast.args[0] as unknown[]
			break

		case "updateOne":
		case "updateMany":
			plan.filter = (ast.args[0] as Record<string, unknown>) ?? {}
			plan.update = (ast.args[1] as Record<string, unknown>) ?? {}
			break

		case "deleteOne":
		case "deleteMany":
			plan.filter = (ast.args[0] as Record<string, unknown>) ?? {}
			break
	}

	// Apply chain modifiers
	for (const chain of ast.chain) {
		switch (chain.method) {
			case "sort":
				plan.options.sort = chain.args[0] as Record<string, number>
				break
			case "limit":
				plan.options.limit = chain.args[0] as number
				break
			case "skip":
				plan.options.skip = chain.args[0] as number
				break
			case "projection":
			case "project":
				plan.options.projection = chain.args[0] as Record<string, number>
				break
		}
	}

	return plan
}
