// Shared helpers for the E2E specs. Every test that creates data uses
// uniqueTitle() and deletes what it made when it's done — these tests run
// against the real, persistent Postgres database (not a mock and not a
// throwaway container), so leftover rows would otherwise pile up across
// repeated runs and eventually pollute the seeded-data checks in
// load-seeded-tasks.spec.js.

export function uniqueTitle(prefix) {
  return `${prefix} ${Date.now()}`
}

export function taskItem(page, title) {
  return page.locator('.task-item').filter({ hasText: title })
}

export async function createTask(page, { title, description = '', priority = 'MEDIUM', dueDate = '' }) {
  await page.getByPlaceholder('Title').fill(title)
  if (description) {
    await page.getByPlaceholder('Description').fill(description)
  }
  if (priority !== 'MEDIUM') {
    await page.locator('select[name="priority"]').selectOption(priority)
  }
  if (dueDate) {
    await page.locator('input[name="dueDate"]').fill(dueDate)
  }
  await page.getByRole('button', { name: 'Add Task' }).click()
  await taskItem(page, title).waitFor({ state: 'visible' })
}

export async function deleteTask(page, title) {
  const item = taskItem(page, title)
  if ((await item.count()) === 0) return
  await item.getByRole('button', { name: 'Delete' }).click()
  await item.waitFor({ state: 'detached' }).catch(() => {})
}
