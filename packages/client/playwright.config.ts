import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@playwright/test"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	testDir: resolve(__dirname, "tests"),
	timeout: 30_000,
	retries: 1,
	use: {
		baseURL: "http://localhost:3000",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
})
