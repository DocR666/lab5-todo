import { test, expect } from '@playwright/test'

// These 3 titles come straight from backend/src/main/resources/data.sql,
// inserted once when the `todo` table is first empty. They should always
// be present unless someone has manually deleted them from the DB.
const SEEDED_TITLES = [
  'Set up PostgreSQL database',
  'Build Spring Boot REST API',
  'Style the React frontend',
]

test('loads the app and shows the 3 seeded sample tasks', async ({ page }) => {
  await page.goto('/')

  for (const title of SEEDED_TITLES) {
    await expect(page.locator('.task-item').filter({ hasText: title })).toBeVisible()
  }
})
