import { MarkdownContent } from './markdown-content'

export function InlineMarkdown({ text }: { text: string }) {
  return <MarkdownContent content={text} variant="inline" />
}
