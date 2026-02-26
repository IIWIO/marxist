import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WordCount from '@/components/TopBar/WordCount'

describe('WordCount', () => {
  it('renders word count in correct format (TB-09)', () => {
    render(<WordCount wordCount={100} letterCount={500} />)
    expect(screen.getByText('W: 100')).toBeInTheDocument()
  })

  it('renders letter count in correct format (TB-09)', () => {
    render(<WordCount wordCount={100} letterCount={500} />)
    expect(screen.getByText('L: 500')).toBeInTheDocument()
  })

  it('handles zero counts', () => {
    render(<WordCount wordCount={0} letterCount={0} />)
    expect(screen.getByText('W: 0')).toBeInTheDocument()
    expect(screen.getByText('L: 0')).toBeInTheDocument()
  })

  it('formats large numbers with commas', () => {
    render(<WordCount wordCount={10000} letterCount={50000} />)
    expect(screen.getByText('W: 10,000')).toBeInTheDocument()
    expect(screen.getByText('L: 50,000')).toBeInTheDocument()
  })
})
