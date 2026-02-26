interface ToggleSwitchProps {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}

export default function ToggleSwitch({ label, description, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          {label}
        </div>
        {description && (
          <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
            {description}
          </div>
        )}
      </div>

      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full transition-colors
          ${checked ? 'bg-accent dark:bg-accent-dark' : 'bg-gray-300 dark:bg-gray-600'}
        `}
      >
        <span
          className={`
            absolute top-1 left-1 w-4 h-4
            bg-white rounded-full shadow
            transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}
