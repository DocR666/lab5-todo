export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  return (
    <li className={`task-item ${task.completed ? 'completed' : ''}`}>
      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />
      <div className="task-info">
        <div className="task-title-row">
          <span className="task-title">{task.title}</span>
          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
        </div>
        {task.description && <p className="task-description">{task.description}</p>}
        {task.dueDate && <span className="task-due-date">Due: {task.dueDate}</span>}
      </div>
      <div className="task-actions">
        <button type="button" onClick={() => onEdit(task)}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>
    </li>
  )
}
