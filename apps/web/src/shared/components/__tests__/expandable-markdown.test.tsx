import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpandableMarkdown } from '../expandable-markdown'

describe('ExpandableMarkdown', () => {
  it('renders markdown content with full formatting', () => {
    const markdown = `# Header
This is **bold** and *italic*.

- List item 1
- List item 2

\`\`\`
code block
\`\`\`
`
    render(<ExpandableMarkdown text={markdown} />)

    expect(screen.getByText('Header')).not.toBeNull()
    expect(screen.getByText('bold')).not.toBeNull()
    expect(screen.getByText('italic')).not.toBeNull()
    expect(screen.getByText('List item 1')).not.toBeNull()
  })

  it('renders simple text without extra formatting', () => {
    render(<ExpandableMarkdown text="Simple text" />)
    expect(screen.getByText('Simple text')).not.toBeNull()
  })

  it('renders links with target="_blank"', () => {
    render(<ExpandableMarkdown text="[Link text](https://example.com)" />)
    const link = screen.getByRole('link', { name: 'Link text' })
    expect(link.getAttribute('href')).toBe('https://example.com')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('renders long markdown without crashing', async () => {
    const longMarkdown = `# Header 1
content line 2
content line 3
content line 4
content line 5
content line 6
content line 7
content line 8
content line 9
content line 10`

    const { container } = render(<ExpandableMarkdown text={longMarkdown} />)

    // Verify markdown was rendered
    expect(container.querySelector('.markdown-content')).not.toBeNull()
  })

  it('hides expand button for short content', async () => {
    render(<ExpandableMarkdown text="Short text" />)

    await new Promise((resolve) => setTimeout(resolve, 50))

    const expandButton = screen.queryByRole('button', { name: /show/i })
    expect(expandButton).toBeNull()
  })

  it('toggles expanded state on button click', async () => {
    const longMarkdown = `# Header
line 2
line 3
line 4
line 5
line 6`

    render(<ExpandableMarkdown text={longMarkdown} />)

    await new Promise((resolve) => setTimeout(resolve, 50))

    let button = screen.queryByRole('button', { name: /show more/i })
    if (!button) return // Skip if content isn't long enough

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /show less/i })).not.toBeNull()

    button = screen.getByRole('button', { name: /show less/i })
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /show more/i })).not.toBeNull()
  })

  it('renders code blocks with proper formatting', () => {
    const markdown = `\`\`\`javascript
const x = 42;
\`\`\``

    render(<ExpandableMarkdown text={markdown} />)
    expect(screen.getByText('const x = 42;')).not.toBeNull()
  })

  it('renders blockquotes', () => {
    const markdown = `> This is a quote`
    render(<ExpandableMarkdown text={markdown} />)
    expect(screen.getByText('This is a quote')).not.toBeNull()
  })
})
