import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBanner from '../ErrorBanner.jsx'

describe('ErrorBanner', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<ErrorBanner message="" onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the 502 message and calls onDismiss when closed', async () => {
    const onDismiss = vi.fn()
    render(
      <ErrorBanner
        message="502 Bad Gateway: Backend API service is down or unreachable."
        onDismiss={onDismiss}
      />,
    )

    expect(
      screen.getByText('502 Bad Gateway: Backend API service is down or unreachable.'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
