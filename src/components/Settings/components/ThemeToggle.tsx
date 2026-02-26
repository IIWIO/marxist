interface ThemeToggleProps {
  value: 'system' | 'light' | 'dark'
  onChange: (value: 'system' | 'light' | 'dark') => void
}

const options: Array<{ value: 'system' | 'light' | 'dark'; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
            ${
              value === option.value
                ? 'bg-white dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark shadow-sm'
                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
