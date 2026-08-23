import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskForm from '../TaskForm.jsx'

describe('TaskForm', () => {
  it('does not submit when the title is blank', async () => {
    const onSubmit = vi.fn()
    render(<TaskForm initialTask={null} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the entered task and clears the form', async () => {
    const onSubmit = vi.fn()
    render(<TaskForm initialTask={null} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Title'), 'Write tests')
    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Write tests', priority: 'MEDIUM' }),
    )
    expect(screen.getByPlaceholderText('Title')).toHaveValue('')
  })

  it('pre-fills fields in edit mode and shows Save/Cancel', () => {
    const initialTask = {
      id: 1,
      title: 'Existing task',
      description: 'desc',
      priority: 'HIGH',
      dueDate: '2026-09-01',
    }
    render(<TaskForm initialTask={initialTask} onSubmit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByPlaceholderText('Title')).toHaveValue('Existing task')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
