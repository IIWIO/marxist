import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TypingIndicator from '@/components/AI/TypingIndicator'

describe('TypingIndicator', () => {
  it('renders three dots', () => {
    const { container } = render(<TypingIndicator />)

    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots).toHaveLength(3)
  })

  it('applies animation delay to dots', () => {
    const { container } = render(<TypingIndicator />)

    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots[0]).toHaveStyle({ animationDelay: '0ms' })
    expect(dots[1]).toHaveStyle({ animationDelay: '150ms' })
    expect(dots[2]).toHaveStyle({ animationDelay: '300ms' })
  })

  it('has left-aligned container', () => {
    const { container } = render(<TypingIndicator />)

    const wrapper = container.querySelector('.flex.justify-start')
    expect(wrapper).toBeInTheDocument()
  })
})
