interface WordCountProps {
  wordCount: number
  letterCount: number
}

export default function WordCount({ wordCount, letterCount }: WordCountProps) {
  return (
    <div className="flex items-center gap-3 text-text-secondary-light dark:text-text-secondary-dark text-xs font-sans">
      <span>W: {wordCount.toLocaleString()}</span>
      <span>L: {letterCount.toLocaleString()}</span>
    </div>
  )
}
