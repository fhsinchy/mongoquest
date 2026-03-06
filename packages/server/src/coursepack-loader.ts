import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import {
	type Challenge,
	ChallengeSchema,
	type CoursepackManifest,
	CoursepackManifestSchema,
	type Module,
	ModuleSchema,
} from "@mongoquest/shared"

export interface LoadedCoursepack {
	manifest: CoursepackManifest
	modules: LoadedModule[]
	seedData: Map<string, unknown[]>
	basePath: string
}

export interface LoadedModule {
	meta: Module
	challenges: Challenge[]
}

const COURSEPACK_DIR = process.env.COURSEPACK_DIR ?? resolve(process.cwd(), "../../coursepacks")

export async function loadAllCoursepacks(): Promise<Map<string, LoadedCoursepack>> {
	const coursepacks = new Map<string, LoadedCoursepack>()
	const dir = resolve(COURSEPACK_DIR)

	let entries: string[]
	try {
		entries = await readdir(dir).then((e) => e.filter((name) => !name.startsWith(".")))
	} catch {
		console.warn(`[coursepack-loader] Coursepacks directory not found: ${dir}`)
		return coursepacks
	}

	for (const entry of entries) {
		const packPath = join(dir, entry)
		try {
			const loaded = await loadCoursepack(packPath)
			coursepacks.set(loaded.manifest.id, loaded)
			console.log(`[coursepack-loader] Loaded: ${loaded.manifest.name} (${loaded.manifest.id})`)
		} catch (err) {
			console.error(`[coursepack-loader] Failed to load ${entry}:`, err)
		}
	}

	return coursepacks
}

async function loadCoursepack(basePath: string): Promise<LoadedCoursepack> {
	// Load and validate manifest
	const manifestRaw = await readFile(join(basePath, "coursepack.json"), "utf-8")
	const manifest = CoursepackManifestSchema.parse(JSON.parse(manifestRaw))

	// Load seed data
	const seedData = new Map<string, unknown[]>()
	const seedDir = join(basePath, manifest.database.seedDir)
	try {
		const seedFiles = await readdir(seedDir)
		for (const file of seedFiles) {
			if (!file.endsWith(".json")) continue
			const collectionName = file.replace(".json", "")
			const data = JSON.parse(await readFile(join(seedDir, file), "utf-8"))
			seedData.set(collectionName, data)
		}
	} catch {
		console.warn(`[coursepack-loader] No seed directory found at ${seedDir}`)
	}

	// Load modules
	const modules: LoadedModule[] = []
	for (const moduleId of manifest.modules) {
		const modulePath = join(basePath, "modules", moduleId)
		const moduleRaw = await readFile(join(modulePath, "module.json"), "utf-8")
		const meta = ModuleSchema.parse(JSON.parse(moduleRaw))

		// Load challenges
		const challenges: Challenge[] = []
		for (const challengeId of meta.challenges) {
			const challengePath = join(modulePath, "challenges", `${challengeId}.json`)
			const challengeRaw = await readFile(challengePath, "utf-8")
			const challenge = ChallengeSchema.parse(JSON.parse(challengeRaw))
			challenges.push(challenge)
		}

		modules.push({ meta, challenges })
	}

	return { manifest, modules, seedData, basePath }
}
