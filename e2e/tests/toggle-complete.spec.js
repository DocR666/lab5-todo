import { test, expect } from '@playwright/test'
import { createTask, deleteTask, taskItem, uniqueTitle } from './utils.js'

test('checking a task marks it completed — reflected via the same class/style the app actually uses', async ({
  page,
}) => {
  const title = uniqueTitle('E2E toggle test')
  await page.goto('/')
  await createTask(page, { title })

  const item = taskItem(page, title)
  await expect(item).not.toHaveClass(/completed/)

  // Plain .click(), not .check() — the checkbox is a *controlled* input
  // (checked={task.completed}), so it only flips after onToggle's PUT
  // request round-trips and React re-renders. .check() does its own
  // built-in "did this change the state" verification immediately after
  // clicking and throws before that round-trip finishes; expect(...)
  // below retries properly instead.
  await item.locator('input[type="checkbox"]').click()

  // TaskItem.jsx adds the "completed" class to the <li>, and App.css defines
  // `.task-item.completed .task-title { text-decoration: line-through }` —
  // asserting both the class and the actual computed style, not guessing.
  await expect(item).toHaveClass(/completed/)
  await expect(item.locator('input[type="checkbox"]')).toBeChecked()
  await expect(item.locator('.task-title')).toHaveCSS('text-decoration-line', 'line-through')

  await deleteTask(page, title)
})
