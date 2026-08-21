import { useEffect, useState } from 'react'

const emptyTask = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
}

export default function TaskForm({ initialTask, onSubmit, onCancel }) {
  const [task, setTask] = useState(emptyTask)

  useEffect(() => {
    if (initialTask) {
      setTask({
        title: initialTask.title || '',
        description: initialTask.description || '',
        priority: initialTask.priority || 'MEDIUM',
        dueDate: initialTask.dueDate || '',
      })
    } else {
      setTask(emptyTask)
    }
  }, [initialTask])

  function handleChange(event) {
    const { name, value } = event.target
    setTask((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!task.title.trim()) return
    onSubmit({ ...task, dueDate: task.dueDate || null })
    if (!initialTask) setTask(emptyTask)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        name="title"
        placeholder="Title"
        value={task.title}
        onChange={handleChange}
        maxLength={100}
        required
      />
      <input
        name="description"
        placeholder="Description"
        value={task.description}
        onChange={handleChange}
        maxLength={255}
      />
      <select name="priority" value={task.priority} onChange={handleChange}>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>
      <input type="date" name="dueDate" value={task.dueDate || ''} onChange={handleChange} />
      <div className="task-form-actions">
        <button type="submit">{initialTask ? 'Save' : 'Add Task'}</button>
        {initialTask && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
