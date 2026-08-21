import { useEffect, useState } from 'react'
import TaskForm from './components/TaskForm.jsx'
import TaskList from './components/TaskList.jsx'
import FilterTabs from './components/FilterTabs.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { createTodo, deleteTodo, fetchTodos, GATEWAY_MESSAGE, updateTodo } from './api/todoApi.js'
import './App.css'

function toErrorMessage(err) {
  if (err instanceof TypeError) {
    return GATEWAY_MESSAGE
  }
  return err.message
}

export default function App() {
  const [todos, setTodos] = useState([])
  const [filter, setFilter] = useState('all')
  const [editingTask, setEditingTask] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTodos()
  }, [])

  async function loadTodos() {
    try {
      const data = await fetchTodos()
      setTodos(data)
      setError('')
    } catch (err) {
      setError(toErrorMessage(err))
    }
  }

  async function handleCreate(task) {
    try {
      const created = await createTodo(task)
      setTodos((prev) => [...prev, created])
      setError('')
    } catch (err) {
      setError(toErrorMessage(err))
    }
  }

  async function handleUpdate(task) {
    try {
      const updated = await updateTodo(editingTask.id, task)
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditingTask(null)
      setError('')
    } catch (err) {
      setError(toErrorMessage(err))
    }
  }

  async function handleToggle(task) {
    try {
      const updated = await updateTodo(task.id, { ...task, completed: !task.completed })
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setError('')
    } catch (err) {
      setError(toErrorMessage(err))
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id)
      setTodos((prev) => prev.filter((t) => t.id !== id))
      setError('')
    } catch (err) {
      setError(toErrorMessage(err))
    }
  }

  const visibleTodos = todos.filter((t) => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  return (
    <div className="app">
      <h1>Lab 5 Todo</h1>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <TaskForm
        key={editingTask ? editingTask.id : 'new'}
        initialTask={editingTask}
        onSubmit={editingTask ? handleUpdate : handleCreate}
        onCancel={() => setEditingTask(null)}
      />
      <FilterTabs filter={filter} onChange={setFilter} />
      <TaskList tasks={visibleTodos} onToggle={handleToggle} onEdit={setEditingTask} onDelete={handleDelete} />
    </div>
  )
}
