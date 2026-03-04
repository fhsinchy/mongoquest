import { z } from "zod/v4"

const ValidationOutputMatch = z.object({
	strategy: z.literal("output_match"),
	expected: z.object({
		filter: z.record(z.string(), z.any()).optional(),
		sort: z.record(z.string(), z.number()).optional(),
		limit: z.number().optional(),
		skip: z.number().optional(),
		projection: z.record(z.string(), z.number()).optional(),
	}),
	orderSensitive: z.boolean().optional().default(false),
	compareIds: z.boolean().optional().default(false),
	subset: z.boolean().optional().default(false),
})

const DocumentCheckItem = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("count"),
		collection: z.string(),
		filter: z.record(z.string(), z.any()),
		expected: z.number(),
	}),
	z.object({
		type: z.literal("exists"),
		collection: z.string(),
		filter: z.record(z.string(), z.any()),
	}),
	z.object({
		type: z.literal("notExists"),
		collection: z.string(),
		filter: z.record(z.string(), z.any()),
	}),
	z.object({
		type: z.literal("fieldEquals"),
		collection: z.string(),
		filter: z.record(z.string(), z.any()),
		field: z.string(),
		expected: z.any(),
	}),
])

const ValidationDocumentCheck = z.object({
	strategy: z.literal("document_check"),
	checks: z.array(DocumentCheckItem).min(1),
})

const ValidationCustom = z.object({
	strategy: z.literal("custom_validator"),
	validatorFile: z.string(),
})

export const ValidationSchema = z.discriminatedUnion("strategy", [
	ValidationOutputMatch,
	ValidationDocumentCheck,
	ValidationCustom,
])

export const CHALLENGE_TYPES = [
	"find",
	"findOne",
	"countDocuments",
	"insertOne",
	"insertMany",
	"updateOne",
	"updateMany",
	"deleteOne",
	"deleteMany",
] as const

export const ChallengeSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	title: z.string().min(1).max(150),
	description: z.string(),
	concept: z.string(),
	hint: z.string(),
	collection: z.string(),
	type: z.enum(CHALLENGE_TYPES),
	validation: ValidationSchema,
	starterCode: z.string(),
	xp: z.number().int().positive(),
})

export type Challenge = z.infer<typeof ChallengeSchema>
export type ValidationConfig = z.infer<typeof ValidationSchema>
export type ChallengeType = (typeof CHALLENGE_TYPES)[number]
