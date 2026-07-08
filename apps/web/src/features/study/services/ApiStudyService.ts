import { httpClient } from '@/shared/services/apiClient'
import type { IStudyService } from './StudyService'
import type {
  Deck,
  DeckCreateInput,
  DeckUpdateInput,
} from '@/features/decks/types/deck'
import type {
  Module,
  ModuleCreateInput,
  ModuleUpdateInput,
} from '@/features/modules/types/module'
import type {
  Note,
  NoteCreateInput,
  NoteUpdateInput,
} from '@/features/notes/types/note'
import type {
  PromptTemplate,
  PromptTemplateCreateInput,
  PromptTemplateUpdateInput,
} from '@/features/helps/types/promptTemplate'
import type {
  Letter,
  LetterCreateInput,
  LetterUpdateInput,
} from '@/features/letters/types/letter'
import type {
  KanbanCard,
  KanbanCardCreateInput,
  KanbanCardUpdateInput,
} from '@/features/kanban/types/kanbanCard'
import type {
  Card,
  CardFront,
  CardBack,
  CardCreateInput,
  CardUpdateInput,
  DueCardsSummary,
  ReviewResult,
} from '@/features/cards/types/card'
import type {
  BrowseCardsQuery,
  BrowseFiltersResponse,
} from '@/features/cards/types/browse'
import type {
  BulkImportRequest,
  ExportCardItem,
  ImportResult,
} from '@/features/cards/importExport/types/importExport'
import type { ReviewPreviewResponse } from '@/features/study/types/preview'
import type { User } from '@/shared/types/api'

/**
 * API Study Service
 * Real implementation that consumes the Go API (Gin) at http://localhost:3030/api/v1
 * Uses shared httpClient with automatic token refresh and authentication
 */
export class ApiStudyService implements IStudyService {
  // Deck Operations
  async getDecks(): Promise<Deck[]> {
    const { data } = await httpClient.get<Deck[]>('/decks')
    return data
  }

  async getDeckStats(): Promise<
    Array<{
      deckId: string
      newCount: number
      learningCount: number
      reviewCount: number
      totalCards: number
      newCardsStudiedToday: number
      newCardsDailyLimit: number
    }>
  > {
    const { data } =
      await httpClient.get<
        Array<{
          deckId: string
          newCount: number
          learningCount: number
          reviewCount: number
          totalCards: number
          newCardsStudiedToday: number
          newCardsDailyLimit: number
        }>
      >('/decks/stats')
    return data
  }

  async getDeck(deckId: string): Promise<Deck> {
    const { data } = await httpClient.get<Deck>(`/decks/${deckId}`)
    return data
  }

  async createDeck(input: DeckCreateInput): Promise<Deck> {
    const payload = {
      name: input.name,
      description: input.description,
      tags: input.tags,
      moduleId: input.moduleId ?? null,
      newCardsDailyLimit: input.newCardsDailyLimit ?? 10,
    }
    const { data } = await httpClient.post<Deck>('/decks', payload)
    return data
  }

  async updateDeck(deckId: string, input: DeckUpdateInput): Promise<Deck> {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.tags !== undefined) payload.tags = input.tags
    if (input.moduleId !== undefined) payload.moduleId = input.moduleId
    if (input.newCardsDailyLimit !== undefined)
      payload.newCardsDailyLimit = input.newCardsDailyLimit
    const { data } = await httpClient.put<Deck>(`/decks/${deckId}`, payload)
    return data
  }

  async deleteDeck(deckId: string): Promise<void> {
    await httpClient.delete(`/decks/${deckId}`)
  }

  async getModules(): Promise<Module[]> {
    const { data } = await httpClient.get<Module[]>('/modules')
    return data
  }

  async createModule(input: ModuleCreateInput): Promise<Module> {
    const { data } = await httpClient.post<Module>('/modules', {
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder ?? 0,
      promptModuleTypeId: input.promptModuleTypeId,
    })
    return data
  }

  async updateModule(
    moduleId: string,
    input: ModuleUpdateInput,
  ): Promise<Module> {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.sortOrder !== undefined) payload.sortOrder = input.sortOrder
    if (input.promptModuleTypeId !== undefined)
      payload.promptModuleTypeId = input.promptModuleTypeId
    const { data } = await httpClient.put<Module>(
      `/modules/${moduleId}`,
      payload,
    )
    return data
  }

  async deleteModule(moduleId: string): Promise<void> {
    await httpClient.delete(`/modules/${moduleId}`)
  }

  // Note Operations
  async getNotes(): Promise<Note[]> {
    const { data } = await httpClient.get<Note[]>('/notes')
    return data
  }

  async getNote(noteId: string): Promise<Note> {
    const { data } = await httpClient.get<Note>(`/notes/${noteId}`)
    return data
  }

  async createNote(input: NoteCreateInput): Promise<Note> {
    const { data } = await httpClient.post<Note>('/notes', {
      title: input.title,
      content: input.content ?? '',
    })
    return data
  }

  async updateNote(noteId: string, input: NoteUpdateInput): Promise<Note> {
    const payload: Record<string, unknown> = {}
    if (input.title !== undefined) payload.title = input.title
    if (input.content !== undefined) payload.content = input.content
    const { data } = await httpClient.put<Note>(`/notes/${noteId}`, payload)
    return data
  }

  async deleteNote(noteId: string): Promise<void> {
    await httpClient.delete(`/notes/${noteId}`)
  }

  // Prompt Template Operations
  async getPromptTemplates(): Promise<PromptTemplate[]> {
    const { data } = await httpClient.get<PromptTemplate[]>('/prompt-templates')
    return data
  }

  async getPromptTemplate(templateId: string): Promise<PromptTemplate> {
    const { data } = await httpClient.get<PromptTemplate>(
      `/prompt-templates/${templateId}`,
    )
    return data
  }

  async createPromptTemplate(
    input: PromptTemplateCreateInput,
  ): Promise<PromptTemplate> {
    const { data } = await httpClient.post<PromptTemplate>(
      '/prompt-templates',
      {
        name: input.name,
        body: input.body,
      },
    )
    return data
  }

  async updatePromptTemplate(
    templateId: string,
    input: PromptTemplateUpdateInput,
  ): Promise<PromptTemplate> {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.body !== undefined) payload.body = input.body
    const { data } = await httpClient.put<PromptTemplate>(
      `/prompt-templates/${templateId}`,
      payload,
    )
    return data
  }

  async deletePromptTemplate(templateId: string): Promise<void> {
    await httpClient.delete(`/prompt-templates/${templateId}`)
  }

  // Letter Operations
  async getLetters(): Promise<Letter[]> {
    const { data } = await httpClient.get<Letter[]>('/letters')
    return data
  }

  async getLetter(letterId: string): Promise<Letter> {
    const { data } = await httpClient.get<Letter>(`/letters/${letterId}`)
    return data
  }

  async createLetter(input: LetterCreateInput): Promise<Letter> {
    const { data } = await httpClient.post<Letter>('/letters', {
      title: input.title,
      artist: input.artist ?? '',
      originalLyrics: input.originalLyrics ?? '',
      translation: input.translation ?? '',
      deckId: input.deckId ?? null,
    })
    return data
  }

  async updateLetter(
    letterId: string,
    input: LetterUpdateInput,
  ): Promise<Letter> {
    const payload: Record<string, unknown> = {}
    if (input.title !== undefined) payload.title = input.title
    if (input.artist !== undefined) payload.artist = input.artist
    if (input.originalLyrics !== undefined)
      payload.originalLyrics = input.originalLyrics
    if (input.translation !== undefined) payload.translation = input.translation
    if (input.deckId !== undefined) payload.deckId = input.deckId
    const { data } = await httpClient.put<Letter>(
      `/letters/${letterId}`,
      payload,
    )
    return data
  }

  async deleteLetter(letterId: string): Promise<void> {
    await httpClient.delete(`/letters/${letterId}`)
  }

  // Kanban Operations
  async getKanbanCards(status?: string): Promise<KanbanCard[]> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : ''
    const { data } = await httpClient.get<KanbanCard[]>(
      `/kanban-cards${suffix}`,
    )
    return data
  }

  async getKanbanCard(cardId: string): Promise<KanbanCard> {
    const { data } = await httpClient.get<KanbanCard>(`/kanban-cards/${cardId}`)
    return data
  }

  async createKanbanCard(input: KanbanCardCreateInput): Promise<KanbanCard> {
    const { data } = await httpClient.post<KanbanCard>('/kanban-cards', {
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      assignee: input.assignee,
      type: input.type,
    })
    return data
  }

  async updateKanbanCard(
    cardId: string,
    input: KanbanCardUpdateInput,
  ): Promise<KanbanCard> {
    const payload: Record<string, unknown> = {}
    if (input.title !== undefined) payload.title = input.title
    if (input.description !== undefined) payload.description = input.description
    if (input.status !== undefined) payload.status = input.status
    if (input.priority !== undefined) payload.priority = input.priority
    if (input.assignee !== undefined) payload.assignee = input.assignee
    if (input.type !== undefined) payload.type = input.type
    if (input.verificationNote !== undefined)
      payload.verificationNote = input.verificationNote
    const { data } = await httpClient.put<KanbanCard>(
      `/kanban-cards/${cardId}`,
      payload,
    )
    return data
  }

  async deleteKanbanCard(cardId: string): Promise<void> {
    await httpClient.delete(`/kanban-cards/${cardId}`)
  }

  async pullNextKanbanCard(assignee?: string): Promise<KanbanCard> {
    const { data } = await httpClient.post<KanbanCard>(
      '/kanban-cards/pull-next',
      {
        assignee: assignee ?? 'claude_code',
      },
    )
    return data
  }

  // Card Operations (full card)
  async getCards(deckId: string): Promise<Card[]> {
    const { data } = await httpClient.get<Card[]>(`/decks/${deckId}/cards`)
    return data
  }

  async getCard(cardId: string): Promise<Card> {
    const { data } = await httpClient.get<Card>(`/cards/${cardId}`)
    return data
  }

  async createCard(input: CardCreateInput): Promise<Card> {
    const { data } = await httpClient.post<Card>('/cards/', input)
    return data
  }

  async updateCard(cardId: string, input: CardUpdateInput): Promise<Card> {
    const { data } = await httpClient.put<Card>(`/cards/${cardId}`, input)
    return data
  }

  async deleteCard(cardId: string): Promise<void> {
    await httpClient.delete(`/cards/${cardId}`)
  }

  async getBrowseFilters(): Promise<BrowseFiltersResponse> {
    const { data } = await httpClient.get<BrowseFiltersResponse>(
      '/cards/browse/filters',
    )
    return data
  }

  async getBrowseCards(query: BrowseCardsQuery = {}): Promise<Card[]> {
    const params = new URLSearchParams()
    if (query.filterType && query.filterType !== 'all') {
      params.set('filterType', query.filterType)
    }
    if (query.filterValue) {
      params.set('filterValue', query.filterValue)
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''
    const { data } = await httpClient.get<Card[]>(`/cards/browse${suffix}`)
    return data
  }

  async bulkCreateCards(request: BulkImportRequest): Promise<ImportResult> {
    const { data } = await httpClient.post<ImportResult>('/cards/bulk', request)
    return data
  }

  async exportDeckCards(deckId: string): Promise<ExportCardItem[]> {
    const { data } = await httpClient.get<ExportCardItem[]>(
      `/cards/deck/${deckId}/export`,
    )
    return data
  }

  // Media Operations
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await httpClient.post<{ url: string }>(
      '/media/images',
      formData,
    )
    return data
  }

  // Card Front/Back Operations (Active Recall)
  async getCardFront(cardId: string): Promise<CardFront> {
    const { data } = await httpClient.get<CardFront>(`/cards/${cardId}/front`)
    return data
  }

  async getCardBack(cardId: string): Promise<CardBack> {
    const { data } = await httpClient.get<CardBack>(`/cards/${cardId}/back`)
    return data
  }

  async getCardAudio(cardId: string): Promise<string> {
    const { data } = await httpClient.get<{ audioBase64: string }>(
      `/cards/${cardId}/audio`,
    )
    return data.audioBase64
  }

  // Study Operations
  async getDueCardsSummary(deckId: string): Promise<DueCardsSummary> {
    const { data } = await httpClient.get<DueCardsSummary>(
      `/cards/deck/${deckId}/due-summary`,
    )
    return data
  }

  async submitReview(
    cardId: string,
    rating: 1 | 2 | 3 | 4,
    reviewDurationMs?: number,
  ): Promise<ReviewResult> {
    const { data } = await httpClient.post<ReviewResult>(
      `/cards/${cardId}/review`,
      { rating, reviewDurationMs },
    )
    return data
  }

  async getReviewPreview(cardId: string): Promise<ReviewPreviewResponse> {
    const { data } = await httpClient.get<ReviewPreviewResponse>(
      `/cards/${cardId}/preview`,
    )
    return data
  }

  // User Operations
  async getCurrentUser(): Promise<User> {
    const { data } = await httpClient.get<User>('/users/me')
    return data
  }

  async updateUser(input: Partial<User>): Promise<User> {
    const { data } = await httpClient.patch<User>('/users/me', input)
    return data
  }

  async updateFSRSSettings(input: {
    desiredRetention?: number
    weights?: number[]
  }): Promise<User> {
    const body: Record<string, unknown> = {}
    if (input.desiredRetention != null) {
      body.desired_retention = input.desiredRetention
    }
    if (input.weights != null) {
      body.weights = input.weights
    }
    const { data } = await httpClient.patch<User>('/users/me/fsrs', body)
    return data
  }

  async optimizeFSRS(): Promise<{ status: string }> {
    const { data } = await httpClient.post<{ status: string }>(
      '/users/me/fsrs/optimize',
    )
    return data
  }
}
