import { Fragment } from 'react'
import { splitHighlight } from '../services/SearchService'

interface HighlightedTextProps {
  text: string
  query: string
  className?: string
}

/** 带搜索高亮的纯文本；命中段加粗 + 黄色（与 SVG `#ffd700` 一致）。 */
export function HighlightedText({ text, query, className }: HighlightedTextProps): JSX.Element {
  if (!query) return <span className={className}>{text}</span>
  const segments = splitHighlight(text, query)
  return (
    <span className={className}>
      {segments.map((s, i) => (
        <Fragment key={i}>
          {s.matched
            ? <span className="text-accent-highlight font-bold">{s.text}</span>
            : s.text}
        </Fragment>
      ))}
    </span>
  )
}
