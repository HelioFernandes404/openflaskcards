import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownContent } from './markdown-content'

describe('MarkdownContent', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders bold text in document variant', () => {
    render(<MarkdownContent content="Hello **world**" variant="document" />)
    expect(screen.getByText('world').tagName).toBe('STRONG')
  })

  it('renders GFM lists in document variant', () => {
    const { container } = render(
      <MarkdownContent
        content={`- first
- second`}
        variant="document"
      />,
    )
    expect(container.querySelector('ul')).toBeInTheDocument()
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.getByText('second')).toBeInTheDocument()
  })

  it('renders links in document variant', () => {
    render(
      <MarkdownContent
        content="Visit [example](https://example.com)"
        variant="document"
      />,
    )
    const link = screen.getByRole('link', { name: 'example' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders mailto links in document variant', () => {
    render(
      <MarkdownContent
        content="Contact [us](mailto:team@example.com)"
        variant="document"
      />,
    )
    const link = screen.getByRole('link', { name: 'us' })
    expect(link).toHaveAttribute('href', 'mailto:team@example.com')
  })

  it('renders relative links in document variant', () => {
    render(
      <MarkdownContent content="See [notes](/notes/123)" variant="document" />,
    )
    const link = screen.getByRole('link', { name: 'notes' })
    expect(link).toHaveAttribute('href', '/notes/123')
  })

  it('strips javascript: links in document variant instead of rendering a clickable anchor', () => {
    const { container } = render(
      <MarkdownContent
        content="[click me](javascript:alert(document.cookie))"
        variant="document"
      />,
    )
    expect(
      screen.queryByRole('link', { name: 'click me' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('a')).not.toBeInTheDocument()
    expect(screen.getByText('click me')).toBeInTheDocument()
  })

  it('strips data: links in document variant instead of rendering a clickable anchor', () => {
    render(
      <MarkdownContent
        content="[click me](data:text/html,<script>alert(1)</script>)"
        variant="document"
      />,
    )
    expect(
      screen.queryByRole('link', { name: 'click me' }),
    ).not.toBeInTheDocument()
  })

  it('strips javascript: links in inline variant instead of rendering a clickable anchor', () => {
    render(
      <MarkdownContent
        content="[click me](javascript:alert(document.cookie))"
        variant="inline"
      />,
    )
    expect(
      screen.queryByRole('link', { name: 'click me' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('click me')).toBeInTheDocument()
  })

  it('does not render block elements in inline variant', () => {
    const { container } = render(
      <MarkdownContent content="# Heading\n- item" variant="inline" />,
    )
    expect(container.querySelector('h1')).not.toBeInTheDocument()
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })

  it('renders inline bold in inline variant', () => {
    render(<MarkdownContent content="Hello **world**" variant="inline" />)
    expect(screen.getByText('world').tagName).toBe('STRONG')
  })

  it('applies bold styling class to inline strong elements', () => {
    render(<MarkdownContent content="Hello **world**" variant="inline" />)
    expect(screen.getByText('world')).toHaveClass('font-bold')
  })

  it('applies italic styling class to inline em elements', () => {
    render(<MarkdownContent content="Hello *world*" variant="inline" />)
    expect(screen.getByText('world')).toHaveClass('italic')
  })
})
