interface FontSizeSliderProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export default function FontSizeSlider({ value, min, max, onChange }: FontSizeSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          flex-1 h-2 rounded-full appearance-none cursor-pointer
          bg-gray-200 dark:bg-gray-700
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:dark:bg-accent-dark
          [&::-webkit-slider-thumb]:cursor-pointer
        "
      />
      <span className="w-12 text-right text-sm font-mono text-text-secondary-light dark:text-text-secondary-dark">
        {value}px
      </span>
    </div>
  )
}
