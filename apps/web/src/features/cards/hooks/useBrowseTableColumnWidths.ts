import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type BrowseTableColumn = 'front' | 'tts' | 'state' | 'deck'

export const BROWSE_TABLE_COLUMNS: BrowseTableColumn[] = [
  'front',
  'tts',
  'state',
  'deck',
]

const STORAGE_KEY = 'openflaskcards.browse-table-column-widths'

export const DEFAULT_COLUMN_WIDTHS: Record<BrowseTableColumn, number> = {
  front: 240,
  tts: 120,
  state: 144,
  deck: 160,
}

const MIN_COLUMN_WIDTHS: Record<BrowseTableColumn, number> = {
  front: 120,
  tts: 88,
  state: 100,
  deck: 100,
}

const MAX_COLUMN_WIDTH = 640

type ColumnWidths = Record<BrowseTableColumn, number>

function clampWidth(column: BrowseTableColumn, width: number): number {
  return Math.min(
    MAX_COLUMN_WIDTH,
    Math.max(MIN_COLUMN_WIDTHS[column], Math.round(width)),
  )
}

function loadStoredWidths(): ColumnWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_COLUMN_WIDTHS }

    const parsed = JSON.parse(raw) as Partial<ColumnWidths>
    return BROWSE_TABLE_COLUMNS.reduce<ColumnWidths>((acc, column) => {
      const stored = parsed[column]
      acc[column] =
        typeof stored === 'number'
          ? clampWidth(column, stored)
          : DEFAULT_COLUMN_WIDTHS[column]
      return acc
    }, {} as ColumnWidths)
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS }
  }
}

function toGridTemplate(widths: ColumnWidths): string {
  return [
    `${widths.front}px`,
    `${widths.tts}px`,
    `${widths.state}px`,
    `minmax(${widths.deck}px, 1fr)`,
  ].join(' ')
}

interface ResizeSession {
  column: BrowseTableColumn
  startX: number
  startWidth: number
}

export function useBrowseTableColumnWidths() {
  const [widths, setWidths] = useState<ColumnWidths>(loadStoredWidths)
  const resizeSessionRef = useRef<ResizeSession | null>(null)
  const tableBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  }, [widths])

  const gridTemplateColumns = useMemo(() => toGridTemplate(widths), [widths])

  const setColumnWidth = useCallback(
    (column: BrowseTableColumn, nextWidth: number) => {
      setWidths((prev) => ({
        ...prev,
        [column]: clampWidth(column, nextWidth),
      }))
    },
    [],
  )

  const startResize = useCallback(
    (column: BrowseTableColumn, clientX: number) => {
      resizeSessionRef.current = {
        column,
        startX: clientX,
        startWidth: widths[column],
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [widths],
  )

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const session = resizeSessionRef.current
      if (!session) return

      const delta = event.clientX - session.startX
      setColumnWidth(session.column, session.startWidth + delta)
    }

    const handleMouseUp = () => {
      if (resizeSessionRef.current) {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      resizeSessionRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [setColumnWidth])

  const autoFitColumn = useCallback(
    (column: BrowseTableColumn, options?: { visibleOnly?: boolean }) => {
      const body = tableBodyRef.current
      if (!body) return

      const table = body.closest('[data-testid="browse-card-table"]')
      const headerCell = table?.querySelector<HTMLElement>(
        `[data-column="${column}"][data-column-role="header"]`,
      )
      const cellSelector = options?.visibleOnly
        ? `[data-virtual-row="true"] [data-column="${column}"][data-column-role="cell"]`
        : `[data-column="${column}"][data-column-role="cell"]`
      const cells = body.querySelectorAll<HTMLElement>(cellSelector)

      const measure = (element: HTMLElement) => {
        const clone = element.cloneNode(true) as HTMLElement
        clone.style.position = 'absolute'
        clone.style.visibility = 'hidden'
        clone.style.pointerEvents = 'none'
        clone.style.width = 'max-content'
        clone.style.maxWidth = 'none'
        clone.style.overflow = 'visible'
        clone.style.whiteSpace = 'nowrap'
        clone.classList.remove('truncate')

        clone.querySelectorAll<HTMLElement>('.truncate').forEach((child) => {
          child.style.overflow = 'visible'
          child.style.textOverflow = 'clip'
          child.style.whiteSpace = 'nowrap'
        })

        document.body.appendChild(clone)
        const width = clone.getBoundingClientRect().width
        document.body.removeChild(clone)
        return width
      }

      let maxWidth = headerCell ? measure(headerCell) : 0
      cells.forEach((cell) => {
        maxWidth = Math.max(maxWidth, measure(cell))
      })

      setColumnWidth(column, maxWidth + 28)
    },
    [setColumnWidth],
  )

  const resetColumnWidths = useCallback(() => {
    setWidths({ ...DEFAULT_COLUMN_WIDTHS })
  }, [])

  return {
    widths,
    gridTemplateColumns,
    tableBodyRef,
    startResize,
    autoFitColumn,
    resetColumnWidths,
  }
}
