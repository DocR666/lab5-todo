import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import App from './App.jsx'
import { server } from './test/mocks/server.js'
import { sampleTodos } from './test/mocks/handlers.js'

describe('App', () => {
  it('loads and displays todos from the (mocked) API', async () => {
    render(<App />)

    expect(await screen.findByText(sampleTodos[0].title)).toBeInTheDocument()
  })

  it('shows the 502 banner when the backend is unreachable', async () => {
    server.use(
      http.get('/api/todos', () => new HttpResponse(null, { status: 502 })),
    )

    render(<App />)

    expect(
      await screen.findByText('502 Bad Gateway: Backend API service is down or unreachable.'),
    ).toBeInTheDocument()
  })
})
