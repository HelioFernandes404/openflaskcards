export type SidebarFilterType = 'all' | 'today' | 'state' | 'deck' | 'tag'
export type TodayFilterValue = 'due' | 'added' | 'edited'
export type CardStateValue = 'new' | 'learning' | 'review' | 'relearning'
export type SortColumn = 'front' | 'state' | 'deck'
export type SortDirection = 'asc' | 'desc'

export interface BrowseFilters {
  sidebarType: SidebarFilterType
  sidebarValue: string | null
  searchQuery: string
  sortColumn: SortColumn
  sortDirection: SortDirection
}

export interface EditorSnapshot {
  frontText: string
  backText: string
  imagemUrl: string | undefined
  cardTags: string
  ttsEnabled: boolean
}

export interface EditorState extends EditorSnapshot {
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  lastSavedAt: Date | null
}

export interface BrowseFilterOption {
  type: SidebarFilterType
  value: string
  label: string
  count: number
}

export interface BrowseFilterSection {
  id: string
  title: string
  options: BrowseFilterOption[]
}

export interface BrowseFiltersResponse {
  totalCards: number
  sections: BrowseFilterSection[]
}

export interface BrowseCardsQuery {
  filterType?: SidebarFilterType | 'all'
  filterValue?: string | null
}
