import { useState, useMemo, useRef, useEffect } from 'react'
import Icon from '@/components/common/Icon'

interface Model {
  id: string
  name: string
  contextLength: number
}

interface ModelSelectorProps {
  value: string
  models: Model[]
  onChange: (value: string) => void
}

export default function ModelSelector({ value, models, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models
    const query = search.toLowerCase()
    return models.filter(
      (m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
    )
  }, [models, search])

  const selectedModel = models.find((m) => m.id === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (modelId: string) => {
    onChange(modelId)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full flex items-center justify-between px-3 py-2
          rounded-lg border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-text-primary-light dark:text-text-primary-dark
          hover:border-gray-400 dark:hover:border-gray-500
          transition-colors
        "
      >
        <span className="truncate">{selectedModel?.name || selectedModel?.id || 'Select a model'}</span>
        <Icon
          name="expand_more"
          size={20}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="
          absolute z-10 mt-1 w-full
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          overflow-hidden
        "
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="
                  w-full pl-9 pr-3 py-2
                  rounded-md border border-gray-200 dark:border-gray-600
                  bg-gray-50 dark:bg-gray-900
                  text-sm text-text-primary-light dark:text-text-primary-dark
                  placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-accent/20
                "
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                No models found
              </div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`
                    w-full px-4 py-2 text-left text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors
                    ${model.id === value ? 'bg-accent/10 dark:bg-accent-dark/10' : ''}
                  `}
                >
                  <div className="font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                    {model.name || model.id}
                  </div>
                  <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                    {model.id} • {(model.contextLength / 1000).toFixed(0)}k context
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
