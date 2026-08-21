const BASE_URL = '/api/todos'

const GATEWAY_MESSAGE = '502 Bad Gateway: Backend API service is down or unreachable.'

async function handleResponse(response) {
  if (response.status === 502) {
    throw new Error(GATEWAY_MESSAGE)
  }
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const data = await response.json()
      message = data.message || message
    } catch {
      // response body wasn't JSON, keep the default message
    }
    throw new Error(message)
  }
  if (response.status === 204) {
    return null
  }
  return response.json()
}

export async function fetchTodos(sort) {
  const url = sort ? `${BASE_URL}?sort=${sort}` : BASE_URL
  const response = await fetch(url)
  return handleResponse(response)
}

export async function createTodo(todo) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  })
  return handleResponse(response)
}

export async function updateTodo(id, todo) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  })
  return handleResponse(response)
}

export async function deleteTodo(id) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  return handleResponse(response)
}

export { GATEWAY_MESSAGE }
