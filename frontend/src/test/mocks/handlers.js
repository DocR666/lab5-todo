import { http, HttpResponse } from 'msw'

export const sampleTodos = [
  {
    id: 1,
    title: 'Sample task',
    description: 'A seeded task for tests',
    completed: false,
    priority: 'HIGH',
    dueDate: '2026-09-01',
    createdAt: '2026-08-01T10:00:00',
  },
]

export const handlers = [
  http.get('/api/todos', () => HttpResponse.json(sampleTodos)),
]
