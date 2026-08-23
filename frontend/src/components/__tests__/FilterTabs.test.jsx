import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterTabs from '../FilterTabs.jsx'

describe('FilterTabs', () => {
  it('marks the active filter and calls onChange when a different tab is clicked', async () => {
    const onChange = vi.fn()
    render(<FilterTabs filter="all" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('active')

    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(onChange).toHaveBeenCalledWith('completed')
  })
})
