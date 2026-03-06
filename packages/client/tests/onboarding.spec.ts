import { expect, test } from "@playwright/test"

test.describe("Onboarding flow", () => {
	test("welcome screen loads and shows coursepacks", async ({ page }) => {
		await page.goto("/")

		// Hero text is visible
		await expect(page.getByText("Master MongoDB")).toBeVisible()
		await expect(page.getByText("One Query at a Time")).toBeVisible()

		// At least one coursepack card appears
		const coursepackLinks = page.locator('a[href^="/learn/"]')
		await expect(coursepackLinks.first()).toBeVisible({ timeout: 10_000 })
	})

	test("picking a coursepack navigates to overview", async ({ page }) => {
		await page.goto("/")

		const coursepackLink = page.locator('a[href^="/learn/"]').first()
		await expect(coursepackLink).toBeVisible({ timeout: 10_000 })
		await coursepackLink.click()

		// Should be on the coursepack overview page
		await expect(page).toHaveURL(/\/learn\/[a-z0-9-]+/)
	})

	test("navigating to first challenge shows challenge interface", async ({ page }) => {
		await page.goto("/")

		// Pick first coursepack
		const coursepackLink = page.locator('a[href^="/learn/"]').first()
		await expect(coursepackLink).toBeVisible({ timeout: 10_000 })
		await coursepackLink.click()

		// Click "Start Learning" or the first challenge link
		const challengeLink = page
			.locator('a[href*="/learn/"]')
			.filter({ hasText: /start|challenge|find/i })
			.first()
		await expect(challengeLink).toBeVisible({ timeout: 10_000 })
		await challengeLink.click()

		// Challenge page should have the editor and challenge pane
		await expect(page).toHaveURL(/\/learn\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+/)
	})
})
