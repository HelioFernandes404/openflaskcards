import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import type { Card, CardUpdateInput } from '@/features/cards/types/card'
import type {
  BrowseFilters,
  BrowseFiltersResponse,
  EditorState,
  SidebarFilterType,
  SortColumn,
} from '@/features/cards/types/browse'
import {
  applyBrowseFilters,
  buildEditorSnapshot,
  buildImageSavePayload,
  buildTextSavePayload,
  buildTtsSavePayload,
  resolveSelection,
  resolveQuickCreateDeckId,
  QUICK_CREATE_PLACEHOLDER,
  toggleSortColumn,
} from '@/features/cards/domain/browseCatalog'
import type { Deck } from '@/features/decks/types/deck'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { useNotification } from '@/shared/providers/NotificationProvider'
import {
  takeBrowsePrefetch,
  invalidateBrowsePrefetch,
} from '@/features/cards/services/browsePrefetch'

export type {
  SidebarFilterType,
  TodayFilterValue,
  CardStateValue,
  SortColumn,
  SortDirection,
  BrowseFilters,
  EditorState,
} from '@/features/cards/types/browse'

export interface UseBrowseCardsViewModelReturn {
  cards: Card[]
  decks: Deck[]
  browseFilters: BrowseFiltersResponse | null
  filteredCards: Card[]
  selectedCard: Card | null
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  filters: BrowseFilters
  setSidebarFilter: (type: SidebarFilterType, value: string | null) => void
  searchInput: string
  setSearchInput: (query: string) => void
  toggleSort: (column: SortColumn) => void
  editor: EditorState
  setFrontText: (text: string) => void
  setBackText: (text: string) => void
  setImagemUrl: (url: string | undefined) => void
  setCardTags: (tags: string) => void
  setTtsEnabled: (enabled: boolean) => void
  setTtsEnabledForCard: (cardId: string, enabled: boolean) => void
  isLoading: boolean
  isLoadingCards: boolean
  isLoadingFilters: boolean
  isUpdating: boolean
  error: string | null
  getDeckName: (deckId: string) => string
  getCardStateLabel: (state: Card['state']) => string
  hasActiveFilters: boolean
  activeFilterLabel: string
  clearFilters: () => void
  cardPendingDelete: Card | null
  requestDeleteCard: () => void
  cancelDeleteCard: () => void
  deleteCard: () => Promise<void>
  isDeletingCard: boolean
  quickCreateCard: () => Promise<void>
  canQuickCreate: boolean
  isCreatingCard: boolean
}

function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number,
): { fn: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const fn = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }

  const cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return { fn, cancel }
}

const emptyEditorState = (): EditorState => ({
  frontText: '',
  backText: '',
  imagemUrl: undefined,
  cardTags: '',
  ttsEnabled: true,
  isDirty: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
})

const editorStateForCard = (card: Card | null): EditorState => ({
  ...buildEditorSnapshot(card),
  isDirty: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
})

export function useBrowseCardsViewModel(): UseBrowseCardsViewModelReturn {
  const {
    decks,
    loading,
    error: dashboardError,
    handleUpdateCard,
    handleDeleteCard,
    handleAddCard,
    studyService,
  } = useStudyData()
  const { showToast } = useNotification()

  const [cards, setCards] = useState<Card[]>([])
  const [browseFilters, setBrowseFilters] =
    useState<BrowseFiltersResponse | null>(null)
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)
  const [rawSelectedCardId, setRawSelectedCardId] = useState<string | null>(
    null,
  )
  const [filters, setFilters] = useState<BrowseFilters>({
    sidebarType: 'all',
    sidebarValue: null,
    searchQuery: '',
    sortColumn: 'front',
    sortDirection: 'asc',
  })
  const [editorCardId, setEditorCardId] = useState<string | null>(null)
  const [localEditor, setLocalEditor] = useState<EditorState>(
    emptyEditorState(),
  )
  const [cardPendingDelete, setCardPendingDelete] = useState<Card | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const skipInitialCardLoad = useRef(false)

  const findFilterLabel = useCallback(
    (type: SidebarFilterType, value: string | null): string | null => {
      if (!browseFilters || !value) return null
      for (const section of browseFilters.sections) {
        const match = section.options.find(
          (opt) => opt.type === type && opt.value === value,
        )
        if (match) return match.label
      }
      return null
    },
    [browseFilters],
  )

  const loadBrowseFilters = useCallback(async () => {
    try {
      setIsLoadingFilters(true)
      setBrowseError(null)
      const data = await studyService.getBrowseFilters()
      setBrowseFilters(data)
    } catch (err) {
      setBrowseError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'Failed to load browse filters.',
        }),
      )
    } finally {
      setIsLoadingFilters(false)
    }
  }, [studyService])

  const loadBrowseCards = useCallback(
    async (nextFilters: BrowseFilters) => {
      try {
        setIsLoadingCards(true)
        setBrowseError(null)
        const data = await studyService.getBrowseCards({
          filterType: nextFilters.sidebarType,
          filterValue: nextFilters.sidebarValue,
        })
        setCards(data)
      } catch (err) {
        setBrowseError(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'Failed to load cards.',
          }),
        )
      } finally {
        setIsLoadingCards(false)
      }
    },
    [studyService],
  )

  useEffect(() => {
    const cached = takeBrowsePrefetch()
    if (cached) {
      setBrowseFilters(cached.filters)
      setCards(cached.cards)
      skipInitialCardLoad.current = true
      return
    }

    void loadBrowseFilters()
  }, [loadBrowseFilters])

  useEffect(() => {
    if (skipInitialCardLoad.current) {
      skipInitialCardLoad.current = false
      return
    }

    void loadBrowseCards(filters)
  }, [filters.sidebarType, filters.sidebarValue, loadBrowseCards])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => {
        if (prev.searchQuery === searchInput) return prev
        return { ...prev, searchQuery: searchInput }
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const deckNameById = useMemo(
    () => new Map(decks.map((deck) => [deck.id, deck.name])),
    [decks],
  )

  const getDeckName = useCallback(
    (deckId: string): string => deckNameById.get(deckId) ?? 'Unknown Deck',
    [deckNameById],
  )

  const getCardStateLabel = useCallback(
    (state: Card['state']): string => {
      return findFilterLabel('state', state) ?? state
    },
    [findFilterLabel],
  )

  const filteredCards = useMemo(
    () => applyBrowseFilters(cards, filters, getDeckName),
    [cards, filters, getDeckName],
  )

  const selectedCardId = useMemo(
    () => resolveSelection(filteredCards, rawSelectedCardId),
    [filteredCards, rawSelectedCardId],
  )

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null
    return cards.find((c) => c.id === selectedCardId) || null
  }, [cards, selectedCardId])

  useLayoutEffect(() => {
    if (selectedCardId === null) {
      if (editorCardId !== null) {
        setEditorCardId(null)
        setLocalEditor(emptyEditorState())
      }
      return
    }

    if (editorCardId === selectedCardId) {
      return
    }

    const card = cards.find((c) => c.id === selectedCardId) ?? null
    setEditorCardId(selectedCardId)
    setLocalEditor(editorStateForCard(card))
  }, [selectedCardId, editorCardId, cards])

  const editor = useMemo((): EditorState => {
    if (editorCardId !== selectedCardId) {
      const snapshot = buildEditorSnapshot(selectedCard)
      return {
        ...snapshot,
        isDirty: false,
        isSaving: false,
        saveError: null,
        lastSavedAt: null,
      }
    }
    return localEditor
  }, [editorCardId, selectedCardId, selectedCard, localEditor])

  const debouncedSave = useMemo(
    () =>
      debounce(async (cardId: string, data: CardUpdateInput) => {
        try {
          setLocalEditor((prev) => ({
            ...prev,
            isSaving: true,
            saveError: null,
          }))
          const updatedCard = await handleUpdateCard(cardId, data)
          setCards((prev) =>
            prev.map((card) => (card.id === cardId ? updatedCard : card)),
          )
          invalidateBrowsePrefetch()
          void loadBrowseFilters()
          setLocalEditor((prev) => ({
            ...prev,
            isSaving: false,
            isDirty: false,
            lastSavedAt: new Date(),
          }))
        } catch (err) {
          const message = getUserFacingErrorMessage(err, {
            fallbackKey: "Couldn't save the card. Please try again.",
          })
          setLocalEditor((prev) => ({
            ...prev,
            isSaving: false,
            saveError: message,
          }))
        }
      }, 600),
    [handleUpdateCard, loadBrowseFilters],
  )

  const setSidebarFilter = useCallback(
    (type: SidebarFilterType, value: string | null) => {
      setFilters((prev) => ({
        ...prev,
        sidebarType: type,
        sidebarValue: value,
      }))
      setRawSelectedCardId(null)
    },
    [],
  )

  const setSearchInputValue = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const hasActiveFilters = useMemo(
    () => filters.sidebarType !== 'all' || searchInput.trim().length > 0,
    [filters.sidebarType, searchInput],
  )

  const activeFilterLabel = useMemo(() => {
    const { sidebarType, sidebarValue } = filters

    if (sidebarType === 'all' || !sidebarValue) {
      return 'All Cards'
    }

    if (sidebarType === 'deck') {
      return getDeckName(sidebarValue)
    }

    return (
      findFilterLabel(sidebarType, sidebarValue) ??
      (sidebarType === 'today' ? 'Today' : sidebarType)
    )
  }, [filters, getDeckName, findFilterLabel])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setFilters((prev) => ({
      ...prev,
      sidebarType: 'all',
      sidebarValue: null,
      searchQuery: '',
    }))
  }, [])

  const toggleSort = useCallback((column: SortColumn) => {
    setFilters((prev) => ({
      ...prev,
      ...toggleSortColumn(prev.sortColumn, prev.sortDirection, column),
    }))
  }, [])

  const setSelectedCardId = useCallback(
    (id: string | null) => {
      debouncedSave.cancel()
      setRawSelectedCardId(id)
    },
    [debouncedSave],
  )

  const setFrontText = useCallback(
    (text: string) => {
      setEditorCardId(selectedCardId)
      setLocalEditor((prev) => ({
        ...prev,
        frontText: text,
        isDirty: true,
        saveError: null,
      }))

      if (selectedCardId) {
        debouncedSave.fn(
          selectedCardId,
          buildTextSavePayload(text, localEditor.backText),
        )
      }
    },
    [selectedCardId, localEditor.backText, debouncedSave],
  )

  const setBackText = useCallback(
    (text: string) => {
      setEditorCardId(selectedCardId)
      setLocalEditor((prev) => ({
        ...prev,
        backText: text,
        isDirty: true,
        saveError: null,
      }))

      if (selectedCardId) {
        debouncedSave.fn(
          selectedCardId,
          buildTextSavePayload(localEditor.frontText, text),
        )
      }
    },
    [selectedCardId, localEditor.frontText, debouncedSave],
  )

  const setImagemUrl = useCallback(
    (url: string | undefined) => {
      setEditorCardId(selectedCardId)
      setLocalEditor((prev) => ({
        ...prev,
        imagemUrl: url,
        isDirty: true,
        saveError: null,
      }))

      if (!selectedCardId) return

      const card = cards.find((c) => c.id === selectedCardId)
      if (!card) return

      const snapshot =
        editorCardId === selectedCardId
          ? {
              frontText: localEditor.frontText,
              backText: localEditor.backText,
              imagemUrl: localEditor.imagemUrl,
              cardTags: localEditor.cardTags,
              ttsEnabled: localEditor.ttsEnabled,
            }
          : buildEditorSnapshot(card)

      debouncedSave.fn(
        selectedCardId,
        buildImageSavePayload(card, snapshot, url),
      )
    },
    [
      selectedCardId,
      editorCardId,
      localEditor.frontText,
      localEditor.backText,
      localEditor.imagemUrl,
      localEditor.cardTags,
      cards,
      debouncedSave,
    ],
  )

  const setCardTags = useCallback(
    (tags: string) => {
      setEditorCardId(selectedCardId)
      setLocalEditor((prev) => ({
        ...prev,
        cardTags: tags,
      }))
    },
    [selectedCardId],
  )

  const setTtsEnabled = useCallback(
    (enabled: boolean) => {
      if (!selectedCardId) return

      const card = cards.find((c) => c.id === selectedCardId)
      if (!card) return

      const previousEnabled = card.ttsEnabled

      setEditorCardId(selectedCardId)
      setLocalEditor((prev) => ({
        ...prev,
        ttsEnabled: enabled,
        isSaving: true,
        saveError: null,
      }))
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCardId ? { ...c, ttsEnabled: enabled } : c,
        ),
      )

      void (async () => {
        try {
          await handleUpdateCard(selectedCardId, buildTtsSavePayload(enabled))
          invalidateBrowsePrefetch()
          setLocalEditor((prev) => ({
            ...prev,
            isSaving: false,
            isDirty: false,
            lastSavedAt: new Date(),
          }))
        } catch (err) {
          const message = getUserFacingErrorMessage(err, {
            fallbackKey: "Couldn't save the card. Please try again.",
          })
          setCards((prev) =>
            prev.map((c) =>
              c.id === selectedCardId
                ? { ...c, ttsEnabled: previousEnabled }
                : c,
            ),
          )
          setLocalEditor((prev) => ({
            ...prev,
            ttsEnabled: previousEnabled,
            isSaving: false,
            saveError: message,
          }))
        }
      })()
    },
    [selectedCardId, cards, handleUpdateCard],
  )

  const setTtsEnabledForCard = useCallback(
    (cardId: string, enabled: boolean) => {
      const card = cards.find((c) => c.id === cardId)
      if (!card) return

      const previousEnabled = card.ttsEnabled

      if (selectedCardId === cardId) {
        setEditorCardId(cardId)
        setLocalEditor((prev) => ({
          ...prev,
          ttsEnabled: enabled,
          isSaving: true,
          saveError: null,
        }))
      }

      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ttsEnabled: enabled } : c)),
      )

      void (async () => {
        try {
          await handleUpdateCard(cardId, buildTtsSavePayload(enabled))
          invalidateBrowsePrefetch()
          if (selectedCardId === cardId) {
            setLocalEditor((prev) => ({
              ...prev,
              isSaving: false,
              isDirty: false,
              lastSavedAt: new Date(),
            }))
          }
        } catch (err) {
          const message = getUserFacingErrorMessage(err, {
            fallbackKey: "Couldn't save the card. Please try again.",
          })
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId ? { ...c, ttsEnabled: previousEnabled } : c,
            ),
          )
          if (selectedCardId === cardId) {
            setLocalEditor((prev) => ({
              ...prev,
              ttsEnabled: previousEnabled,
              isSaving: false,
              saveError: message,
            }))
          }
        }
      })()
    },
    [cards, selectedCardId, handleUpdateCard],
  )

  const requestDeleteCard = useCallback(() => {
    if (!selectedCard) return
    setCardPendingDelete(selectedCard)
  }, [selectedCard])

  const cancelDeleteCard = useCallback(() => {
    setCardPendingDelete(null)
  }, [])

  const deleteCard = useCallback(async () => {
    if (!cardPendingDelete) return

    debouncedSave.cancel()
    const deletedId = cardPendingDelete.id

    try {
      await handleDeleteCard(deletedId)
      setCards((prev) => prev.filter((c) => c.id !== deletedId))
      invalidateBrowsePrefetch()
      void loadBrowseFilters()
      setEditorCardId(null)
      setLocalEditor(emptyEditorState())
    } finally {
      setCardPendingDelete(null)
    }
  }, [cardPendingDelete, debouncedSave, handleDeleteCard, loadBrowseFilters])

  const quickCreateDeckId = useMemo(
    () => resolveQuickCreateDeckId(filters, selectedCard, decks),
    [filters, selectedCard, decks],
  )

  const canQuickCreate = quickCreateDeckId !== null

  const quickCreateCard = useCallback(async () => {
    if (!quickCreateDeckId) return

    debouncedSave.cancel()

    const newCard = await handleAddCard({
      deckId: quickCreateDeckId,
      front: QUICK_CREATE_PLACEHOLDER.front,
      back: QUICK_CREATE_PLACEHOLDER.back,
    })

    if (!newCard) return

    showToast('Card added')

    try {
      const reloaded = await studyService.getBrowseCards({
        filterType: filters.sidebarType,
        filterValue: filters.sidebarValue,
      })
      const includesNewCard = reloaded.some((card) => card.id === newCard.id)
      setCards(includesNewCard ? reloaded : [newCard, ...reloaded])
    } catch {
      setCards((prev) => [newCard, ...prev])
    }

    invalidateBrowsePrefetch()
    void loadBrowseFilters()
    setRawSelectedCardId(newCard.id)
  }, [
    quickCreateDeckId,
    debouncedSave,
    handleAddCard,
    showToast,
    studyService,
    filters.sidebarType,
    filters.sidebarValue,
    loadBrowseFilters,
  ])

  return {
    cards,
    decks,
    browseFilters,
    filteredCards,
    selectedCard,
    selectedCardId,
    setSelectedCardId,
    filters,
    setSidebarFilter,
    searchInput,
    setSearchInput: setSearchInputValue,
    toggleSort,
    editor,
    setFrontText,
    setBackText,
    setImagemUrl,
    setCardTags,
    setTtsEnabled,
    setTtsEnabledForCard,
    isLoading: isLoadingCards || isLoadingFilters,
    isLoadingCards,
    isLoadingFilters,
    isUpdating: loading.updateCard,
    error: dashboardError ?? browseError,
    getDeckName,
    getCardStateLabel,
    hasActiveFilters,
    activeFilterLabel,
    clearFilters,
    cardPendingDelete,
    requestDeleteCard,
    cancelDeleteCard,
    deleteCard,
    isDeletingCard: loading.deleteCard,
    quickCreateCard,
    canQuickCreate,
    isCreatingCard: loading.addCard,
  }
}
