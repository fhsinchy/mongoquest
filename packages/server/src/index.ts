import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { checkConnection } from "./db"

const app = new Hono()

// Middleware
app.use("*", logger())
app.use("/api/*", cors())

// Global error handler
app.onError((err, c) => {
	console.error("Unhandled error:", err)
	return c.json(
		{ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
		500,
	)
})

// Health check
app.get("/api/health", async (c) => {
	const mongoConnected = await checkConnection()
	return c.json({
		status: mongoConnected ? "ok" : "degraded",
		mongo: mongoConnected ? "connected" : "disconnected",
		uptime: process.uptime(),
	})
})

const port = Number.parseInt(process.env.PORT ?? "3000", 10)

export default {
	port,
	fetch: app.fetch,
}

export { app }
