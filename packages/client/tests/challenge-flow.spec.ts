import { expect, test } from "@playwright/test"

// Helper to seed the coursepack before running challenges
async function seedAndNavigateToFirstChallenge(page: import("@playwright/test").Page) {
	// Go to home, pick first coursepack
	await page.goto("/")
	const coursepackLink = page.locator('a[href^="/learn/"]').first()
	await expect(coursepackLink).toBeVisible({ timeout: 10_000 })
	const href = await coursepackLink.getAttribute("href")
	const coursepackId = href!.replace("/learn/", "")

	// Seed the coursepack via API
	await page.request.post(`/api/coursepacks/${coursepackId}/seed`)

	// Navigate to coursepack overview
	await coursepackLink.click()
	await expect(page).toHaveURL(/\/learn\//)

	// Find and click first challenge link
	const challengeLink = page
		.locator('a[href*="/learn/"]')
		.filter({ hasText: /start|challenge|find/i })
		.first()
	await expect(challengeLink).toBeVisible({ timeout: 10_000 })
	await challengeLink.click()

	await expect(page).toHaveURL(/\/learn\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+/)
}

test.describe("Challenge flow", () => {
	test("correct query shows success feedback", async ({ page }) => {
		await seedAndNavigateToFirstChallenge(page)

		// The first challenge is typically "Find All Documents" with starter code db.orders.find()
		// Look for the Run button and click it (starter code may already be correct for first challenge)
		const runButton = page.getByRole("button", { name: /run/i })
		await expect(runButton).toBeVisible({ timeout: 10_000 })
		await runButton.click()

		// Wait for result — should show success indicator or feedback
		const successIndicator = page.locator("text=/Correct|XP earned/i")
		await expect(successIndicator.first()).toBeVisible({ timeout: 15_000 })
	})

	test("wrong query shows failure feedback", async ({ page }) => {
		await seedAndNavigateToFirstChallenge(page)

		// Type an incorrect query in the editor
		// Monaco editor — we need to clear and type
		const editor = page.locator(".monaco-editor textarea")
		await editor.focus()

		// Select all and replace with wrong query
		await page.keyboard.press("Meta+a")
		await page.keyboard.press("Control+a")
		await page.keyboard.type('db.orders.find({ status: "nonexistent_status_xyz" })')

		const runButton = page.getByRole("button", { name: /run/i })
		await runButton.click()

		// Should show failure feedback (not success)
		const feedbackArea = page.locator("text=/returned|expected|error|wrong|filter/i")
		await expect(feedbackArea.first()).toBeVisible({ timeout: 15_000 })
	})
})
