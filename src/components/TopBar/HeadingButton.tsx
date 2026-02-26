import Tooltip from '@/components/common/Tooltip'
import Icon from '@/components/common/Icon'

interface HeadingButtonProps {
  level: 1 | 2 | 3 | 4
  onClick: () => void
  disabled?: boolean
}

export default function HeadingButton({ level, onClick, disabled = false }: HeadingButtonProps) {
  const label = `Heading ${level}`
  const shortcut = level <= 2 ? `⌘⌥${level}` : undefined

  return (
    <Tooltip content={shortcut ? `${label} (${shortcut})` : label}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`
          flex items-center justify-center w-6 h-6
          transition-colors duration-150
          ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        `}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Icon name={`format_h${level}`} size={20} />
      </button>
    </Tooltip>
  )
}
