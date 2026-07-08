import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/shared/utils'

type MarkdownVariant = 'document' | 'inline'

interface MarkdownContentProps {
  content: string
  variant?: MarkdownVariant
  className?: string
}

const inlineComponents: Components = {
  p: ({ children }) => <>{children}</>,
  h1: ({ children }) => <>{children}</>,
  h2: ({ children }) => <>{children}</>,
  h3: ({ children }) => <>{children}</>,
  h4: ({ children }) => <>{children}</>,
  h5: ({ children }) => <>{children}</>,
  h6: ({ children }) => <>{children}</>,
  ul: ({ children }) => <>{children}</>,
  ol: ({ children }) => <>{children}</>,
  li: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <>{children}</>,
  pre: ({ children }) => <>{children}</>,
  hr: () => null,
  strong: ({ children }) => (
    <strong className="font-bold text-neutral-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
}

const documentComponents: Components = {
  strong: ({ children }) => (
    <strong className="font-bold text-neutral-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className)
    if (isBlock) {
      return (
        <code
          className={cn(
            'block overflow-x-auto rounded-md bg-surface-container-high px-4 py-3 font-mono text-sm text-on-surface',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-sm text-on-surface"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md bg-surface-container-high p-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-outline-variant pl-4 italic text-on-surface-variant">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-xl font-semibold tracking-tight text-on-surface">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-6 text-on-surface">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-6 text-on-surface">{children}</ol>
  ),
  p: ({ children }) => (
    <p className="leading-relaxed text-on-surface">{children}</p>
  ),
}

export function MarkdownContent({
  content,
  variant = 'document',
  className,
}: MarkdownContentProps) {
  const isInline = variant === 'inline'
  const Wrapper = isInline ? 'span' : 'div'

  return (
    <Wrapper
      className={cn(
        isInline ? 'inline-markdown' : 'markdown-content space-y-4',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={isInline ? inlineComponents : documentComponents}
        allowedElements={
          isInline
            ? ['strong', 'em', 'del', 'a', 'code', 'text', 'br']
            : undefined
        }
        unwrapDisallowed={isInline}
      >
        {content}
      </ReactMarkdown>
    </Wrapper>
  )
}
