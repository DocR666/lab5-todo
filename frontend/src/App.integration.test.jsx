import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import App from './App.jsx'
import { server } from './test/mocks/server.js'

// Integration tests, not unit tests: these render the real <App /> composed
// with its real children (TaskForm, TaskList/TaskItem, FilterTabs,
// ErrorBanner) and drive them via userEvent, checking that an action on one
// component correctly flows through App's state into another component's
// rendered output. The component-level unit tests
// (components/__tests__/*.test.jsx) already cover each component in
// isolation with mocked callback props — this file is what's between those
// and the E2E suite (e2e/): only the network boundary is faked (via MSW,
// same as App.test.jsx), nothing about the component tree is mocked.

describe('App integration', () => {
  it('submitting the real TaskForm adds the task to the real TaskList', async () => {
    server.use(
      http.get('/api/todos', () => HttpResponse.json([])),
      http.post('/api/todos', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ ...body, id: 42, completed: false }, { status: 201 })
      }),
    )

    render(<App />)
    await screen.findByText('No tasks to show.')

    await userEvent.type(screen.getByPlaceholderText('Title'), 'Integration test task')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'HIGH')
    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }))

    const item = (await screen.findByText('Integration test task')).closest('li')
    expect(within(item).getByText('HIGH')).toBeInTheDocument()

    // The form clearing after submit is TaskForm's own concern (already
    // covered by TaskForm.test.jsx) — the integration-specific part is that
    // App actually appended the server's response into the real TaskList.
    expect(screen.queryByText('No tasks to show.')).not.toBeInTheDocument()
  })

  it("toggling a task's checkbox updates what the real FilterTabs-filtered TaskList shows", async () => {
    const task = {
      id: 7,
      title: 'Toggle integration task',
      description: '',
      completed: false,
      priority: 'MEDIUM',
      dueDate: null,
    }

    server.use(
      http.get('/api/todos', () => HttpResponse.json([task])),
      http.put('/api/todos/:id', async ({ request, params }) => {
        const body = await request.json()
        return HttpResponse.json({ ...body, id: Number(params.id) })
      }),
    )

    render(<App />)
    const title = await screen.findByText('Toggle integration task')
    const item = title.closest('li')

    await userEvent.click(screen.getByRole('button', { name: 'Active' }))
    expect(screen.getByText('Toggle integration task')).toBeInTheDocument()

    await userEvent.click(within(item).getByRole('checkbox'))

    // Still on the "Active" filter — a now-completed task should disappear
    // from it. This is the part a component-isolated unit test can't show:
    // it depends on TaskItem's onToggle, App's state update, *and*
    // FilterTabs' currently-selected filter all working together correctly.
    await screen.findByText('No tasks to show.')

    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(await screen.findByText('Toggle integration task')).toBeInTheDocument()
  })

  it('dismissing the real ErrorBanner clears it from the DOM', async () => {
    server.use(http.get('/api/todos', () => new HttpResponse(null, { status: 502 })))

    render(<App />)
    await screen.findByText('502 Bad Gateway: Backend API service is down or unreachable.')

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(
      screen.queryByText('502 Bad Gateway: Backend API service is down or unreachable.'),
    ).not.toBeInTheDocument()
  })
})
