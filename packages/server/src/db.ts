import { type Db, MongoClient } from "mongodb"

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://admin:mongoquest@localhost:27017"
const READONLY_USER = process.env.MONGO_READONLY_USER ?? "mongoquest_readonly"
const WRITER_USER = process.env.MONGO_WRITER_USER ?? "mongoquest_writer"
const PASSWORD = process.env.MONGO_PASSWORD ?? "mongoquest"

let readClient: MongoClient | null = null
let writeClient: MongoClient | null = null

function buildUri(user: string, password: string): string {
	const url = new URL(MONGO_URI)
	url.username = user
	url.password = password
	return url.toString()
}

export async function getReadClient(): Promise<MongoClient> {
	if (!readClient) {
		readClient = new MongoClient(buildUri(READONLY_USER, PASSWORD))
		await readClient.connect()
	}
	return readClient
}

export async function getWriteClient(): Promise<MongoClient> {
	if (!writeClient) {
		writeClient = new MongoClient(buildUri(WRITER_USER, PASSWORD))
		await writeClient.connect()
	}
	return writeClient
}

export async function getDb(dbName: string, writable = false): Promise<Db> {
	const client = writable ? await getWriteClient() : await getReadClient()
	return client.db(dbName)
}

export async function checkConnection(): Promise<boolean> {
	try {
		const client = await getReadClient()
		await client.db("admin").command({ ping: 1 })
		return true
	} catch {
		return false
	}
}

export async function closeConnections(): Promise<void> {
	await readClient?.close()
	await writeClient?.close()
	readClient = null
	writeClient = null
}
