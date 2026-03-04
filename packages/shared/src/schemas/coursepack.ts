import { z } from "zod/v4"

export const CoursepackManifestSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/, "Must be lowercase alphanumeric with hyphens"),
	name: z.string().min(1).max(100),
	version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be valid semver"),
	description: z.string().max(500),
	author: z.string(),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]),
	estimatedHours: z.number().positive(),
	minMongoVersion: z.string().optional().default("7.0"),
	database: z.object({
		name: z.string().regex(/^[a-z_]+$/, "Must be lowercase with underscores"),
		seedDir: z.string(),
	}),
	modules: z.array(z.string()).min(1),
})

export type CoursepackManifest = z.infer<typeof CoursepackManifestSchema>
