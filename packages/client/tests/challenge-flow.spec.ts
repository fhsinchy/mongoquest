import { expect, test } from "@playwright/test"

const COURSEPACK_ID = "crud-essentials"
const MODULE_ID = "01-reading-documents"
const CHALLENGE_ID = "01-find-all"
const CHALLENGE_URL = `/learn/${COURSEPACK_ID}/${MODULE_ID}/${CHALLENGE_ID}`

test.describe("Challenge flow", () => {
	test.beforeEach(async ({ page }) => {
		// Seed the coursepack via API before each test
		await page.request.post(`/api/coursepacks/${COURSEPACK_ID}/seed`)
	})

	test("correct query shows success feedback", async ({ page }) => {
		await page.goto(CHALLENGE_URL)

		// Wait for the Run button (indicates challenge page loaded with editor)
		const runButton = page.getByRole("button", { name: /run/i })
		await expect(runButton).toBeVisible({ timeout: 15_000 })

		// First challenge starter code (db.customers.find()) is already correct — just click Run
		await runButton.click()

		// Wait for success — shows "+10 XP earned!"
		await expect(page.getByText(/XP earned/i)).toBeVisible({ timeout: 15_000 })
	})

	test("wrong query shows failure feedback", async ({ page }) => {
		await page.goto(CHALLENGE_URL)

		// Wait for the Run button
		const runButton = page.getByRole("button", { name: /run/i })
		await expect(runButton).toBeVisible({ timeout: 15_000 })

		// Monaco editor — focus the textarea and replace content with a wrong query
		const editor = page.locator(".monaco-editor textarea")
		await editor.focus()

		// Select all and replace with wrong query
		await page.keyboard.press("Control+a")
		await page.keyboard.type('db.customers.find({ name: "nonexistent_xyz" })')

		await runButton.click()

		// Should show failure feedback (filter mismatch, expected/returned, etc.)
		await expect(page.getByText(/filter|expected|returned|mismatch/i).first()).toBeVisible({
			timeout: 15_000,
		})
	})
})
