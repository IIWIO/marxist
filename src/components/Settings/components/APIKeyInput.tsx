import { useState } from 'react'
import Icon from '@/components/common/Icon'

interface APIKeyInputProps {
  value: string
  onChange: (value: string) => void
  onVerify: () => void
  isVerifying: boolean
  isVerified: boolean
  error: string | null
}

export default function APIKeyInput({
  value,
  onChange,
  onVerify,
  isVerifying,
  isVerified,
  error,
}: APIKeyInputProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="sk-or-v1-..."
            className={`
              w-full px-3 py-2 pr-10
              rounded-lg border
              bg-white dark:bg-gray-800
              text-text-primary-light dark:text-text-primary-dark
              placeholder-gray-400
              focus:outline-none focus:ring-2
              ${
                error
                  ? 'border-red-500 focus:ring-red-500/20'
                  : isVerified
                    ? 'border-green-500 focus:ring-green-500/20'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-accent/20 dark:focus:ring-accent-dark/20'
              }
            `}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            <Icon name={showKey ? 'visibility_off' : 'visibility'} size={18} />
          </button>
        </div>

        <button
          onClick={onVerify}
          disabled={isVerifying || !value.trim()}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm
            transition-colors
            ${
              isVerifying || !value.trim()
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : isVerified
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-accent dark:bg-accent-dark text-white hover:opacity-90'
            }
          `}
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <Icon name="sync" size={16} className="animate-spin" />
              Verifying
            </span>
          ) : isVerified ? (
            <span className="flex items-center gap-2">
              <Icon name="check_circle" size={16} />
              Verified
            </span>
          ) : (
            'Verify'
          )}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
