interface DocumentNameProps {
  name: string
  isDirty: boolean
}

export default function DocumentName({ name, isDirty }: DocumentNameProps) {
  return (
    <div
      className="font-sans font-medium text-xs text-text-primary-light dark:text-text-primary-dark truncate"
      style={{ maxWidth: '200px', marginTop: '1px' }}
      title={name}
    >
      {isDirty && <span className="text-text-secondary-light dark:text-text-secondary-dark mr-1">•</span>}
      {name}
    </div>
  )
}
