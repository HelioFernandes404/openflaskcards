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
 * Study Service Interface
 * Defines the data access methods for the study system.
 */
export interface IStudyService {
  // Deck Operations
  getDecks(): Promise<Deck[]>
  getDeckStats(): Promise<
    Array<{
      deckId: string
      newCount: number
      learningCount: number
      reviewCount: number
      totalCards: number
      newCardsStudiedToday: number
      newCardsDailyLimit: number
    }>
  >
  getDeck(deckId: string): Promise<Deck>
  createDeck(data: DeckCreateInput): Promise<Deck>
  updateDeck(deckId: string, data: DeckUpdateInput): Promise<Deck>
  deleteDeck(deckId: string): Promise<void>

  // Module Operations
  getModules(): Promise<Module[]>
  createModule(data: ModuleCreateInput): Promise<Module>
  updateModule(moduleId: string, data: ModuleUpdateInput): Promise<Module>
  deleteModule(moduleId: string): Promise<void>

  // Note Operations
  getNotes(): Promise<Note[]>
  getNote(noteId: string): Promise<Note>
  createNote(data: NoteCreateInput): Promise<Note>
  updateNote(noteId: string, data: NoteUpdateInput): Promise<Note>
  deleteNote(noteId: string): Promise<void>

  // Prompt Template Operations
  getPromptTemplates(): Promise<PromptTemplate[]>
  getPromptTemplate(templateId: string): Promise<PromptTemplate>
  createPromptTemplate(data: PromptTemplateCreateInput): Promise<PromptTemplate>
  updatePromptTemplate(
    templateId: string,
    data: PromptTemplateUpdateInput,
  ): Promise<PromptTemplate>
  deletePromptTemplate(templateId: string): Promise<void>

  // Letter Operations
  getLetters(): Promise<Letter[]>
  getLetter(letterId: string): Promise<Letter>
  createLetter(data: LetterCreateInput): Promise<Letter>
  updateLetter(letterId: string, data: LetterUpdateInput): Promise<Letter>
  deleteLetter(letterId: string): Promise<void>

  // Kanban Operations
  getKanbanCards(status?: string): Promise<KanbanCard[]>
  getKanbanCard(cardId: string): Promise<KanbanCard>
  createKanbanCard(data: KanbanCardCreateInput): Promise<KanbanCard>
  updateKanbanCard(
    cardId: string,
    data: KanbanCardUpdateInput,
  ): Promise<KanbanCard>
  deleteKanbanCard(cardId: string): Promise<void>
  pullNextKanbanCard(assignee?: string): Promise<KanbanCard>

  // Card Operations (full card)
  getCards(deckId: string): Promise<Card[]>
  getCard(cardId: string): Promise<Card>
  createCard(data: CardCreateInput): Promise<Card>
  updateCard(cardId: string, data: CardUpdateInput): Promise<Card>
  deleteCard(cardId: string): Promise<void>

  // Browse Operations
  getBrowseFilters(): Promise<BrowseFiltersResponse>
  getBrowseCards(query?: BrowseCardsQuery): Promise<Card[]>

  // Import / Export Operations
  bulkCreateCards(request: BulkImportRequest): Promise<ImportResult>
  exportDeckCards(deckId: string): Promise<ExportCardItem[]>

  // Media Operations
  uploadImage(file: File): Promise<{ url: string }>

  // Card Front/Back Operations (Active Recall)
  getCardFront(cardId: string): Promise<CardFront>
  getCardBack(cardId: string): Promise<CardBack>

  // TTS audio for listening cards
  getCardAudio(cardId: string): Promise<string>

  // Study Operations
  getDueCardsSummary(deckId: string): Promise<DueCardsSummary>
  submitReview(
    cardId: string,
    rating: 1 | 2 | 3 | 4,
    durationMs?: number,
  ): Promise<ReviewResult>
  getReviewPreview(cardId: string): Promise<ReviewPreviewResponse>

  // User Operations
  getCurrentUser(): Promise<User>
  updateUser(data: Partial<User>): Promise<User>
  updateFSRSSettings(input: {
    desiredRetention?: number
    weights?: number[]
  }): Promise<User>
  optimizeFSRS(): Promise<{ status: string }>
}
