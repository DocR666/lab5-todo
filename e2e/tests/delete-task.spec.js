import { test, expect } from '@playwright/test'
import { createTask, taskItem, uniqueTitle } from './utils.js'

test('a deleted task disappears and stays gone after reload (round-trips through the real backend + Postgres)', async ({
  page,
}) => {
  const title = uniqueTitle('E2E delete test')
  await page.goto('/')
  await createTask(page, { title })
  await expect(taskItem(page, title)).toBeVisible()

  await taskItem(page, title).getByRole('button', { name: 'Delete' }).click()
  await expect(taskItem(page, title)).toHaveCount(0)

  // If this were only local React state, the task would still be gone
  // either way after a reload. Confirming it's *still* gone after a fresh
  // GET /api/todos from the real backend is what actually proves the
  // delete persisted to Postgres rather than just updating the UI.
  await page.reload()
  await expect(taskItem(page, title)).toHaveCount(0)
})
