import { z } from "zod/v4"

export const ModuleSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	name: z.string().min(1).max(100),
	description: z.string(),
	challenges: z.array(z.string()).min(1),
})

export type Module = z.infer<typeof ModuleSchema>
