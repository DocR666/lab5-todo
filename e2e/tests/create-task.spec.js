import { test, expect } from '@playwright/test'
import { createTask, deleteTask, taskItem, uniqueTitle } from './utils.js'

test('creating a todo via the form makes it appear in the list', async ({ page }) => {
  const title = uniqueTitle('E2E create test')
  await page.goto('/')

  await createTask(page, { title, description: 'created by Playwright', priority: 'HIGH' })

  const item = taskItem(page, title)
  await expect(item).toBeVisible()
  await expect(item.locator('.task-description')).toHaveText('created by Playwright')
  await expect(item.locator('.priority-badge')).toHaveText('HIGH')

  await deleteTask(page, title) // cleanup so repeated runs don't accumulate rows
})
