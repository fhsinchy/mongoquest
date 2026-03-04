import { getDb } from "./db"
import type { LoadedCoursepack } from "./coursepack-loader"

export async function seedCoursepack(
	coursepack: LoadedCoursepack,
): Promise<{ database: string; collections: string[]; documentCount: number }> {
	const dbName = `mongoquest_${coursepack.manifest.id.replace(/-/g, "_")}`
	const db = await getDb(dbName, true)

	let totalDocs = 0
	const collections: string[] = []

	for (const [collectionName, documents] of coursepack.seedData) {
		const collection = db.collection(collectionName)
		await collection.drop().catch(() => {}) // ignore if doesn't exist
		if (documents.length > 0) {
			await collection.insertMany(documents as any[])
			totalDocs += documents.length
		}
		collections.push(collectionName)
	}

	return { database: dbName, collections, documentCount: totalDocs }
}

export async function resetCollection(
	dbName: string,
	collectionName: string,
	seedData: unknown[],
): Promise<void> {
	const db = await getDb(dbName, true)
	const collection = db.collection(collectionName)
	await collection.drop().catch(() => {})
	if (seedData.length > 0) {
		await collection.insertMany(seedData as any[])
	}
}
