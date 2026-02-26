interface SystemPromptEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function SystemPromptEditor({ value, onChange }: SystemPromptEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={6}
      className="
        w-full px-3 py-2
        rounded-lg border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800
        text-sm text-text-primary-light dark:text-text-primary-dark
        placeholder-gray-400
        resize-y min-h-[120px]
        focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:ring-accent-dark/20
        focus:border-accent dark:focus:border-accent-dark
      "
      placeholder="Enter system prompt..."
    />
  )
}
