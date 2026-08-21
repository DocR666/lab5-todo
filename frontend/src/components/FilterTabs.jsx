const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export default function FilterTabs({ filter, onChange }) {
  return (
    <div className="filter-tabs">
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`filter-tab ${filter === value ? 'active' : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
