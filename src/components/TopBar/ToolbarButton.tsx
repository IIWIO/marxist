import Icon from '@/components/common/Icon'
import Tooltip from '@/components/common/Tooltip'

interface ToolbarButtonProps {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  shortcut?: string
}

export default function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
  shortcut,
}: ToolbarButtonProps) {
  const tooltipContent = shortcut ? `${label} (${shortcut})` : label

  return (
    <Tooltip content={tooltipContent}>
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
        <Icon name={icon} size={20} />
      </button>
    </Tooltip>
  )
}
