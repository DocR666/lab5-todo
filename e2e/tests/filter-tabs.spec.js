import { test, expect } from '@playwright/test'
import { createTask, deleteTask, taskItem, uniqueTitle } from './utils.js'

test('All/Active/Completed filter tabs show the correct subset', async ({ page }) => {
  const activeTitle = uniqueTitle('E2E filter active')
  const completedTitle = uniqueTitle('E2E filter completed')

  await page.goto('/')
  await createTask(page, { title: activeTitle })
  await createTask(page, { title: completedTitle })
  // Plain .click(), not .check() — see toggle-complete.spec.js for why
  // (controlled checkbox, async PUT round-trip before it visually flips).
  await taskItem(page, completedTitle).locator('input[type="checkbox"]').click()
  await expect(taskItem(page, completedTitle).locator('input[type="checkbox"]')).toBeChecked()

  await page.getByRole('button', { name: 'Active' }).click()
  await expect(taskItem(page, activeTitle)).toBeVisible()
  await expect(taskItem(page, completedTitle)).toHaveCount(0)

  await page.getByRole('button', { name: 'Completed' }).click()
  await expect(taskItem(page, completedTitle)).toBeVisible()
  await expect(taskItem(page, activeTitle)).toHaveCount(0)

  await page.getByRole('button', { name: 'All' }).click()
  await expect(taskItem(page, activeTitle)).toBeVisible()
  await expect(taskItem(page, completedTitle)).toBeVisible()

  await deleteTask(page, activeTitle)
  await deleteTask(page, completedTitle)
})
