import type {
  Deck,
  DeckCreateInput,
  DeckUpdateInput,
} from '@/features/decks/types/deck'
import { DEFAULT_PROMPT_MODULE_TYPE_ID } from '@/features/helps/domain/promptModules'
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
import {
  KANBAN_COLUMNS,
  type KanbanAssignee,
  type KanbanCard,
  type KanbanCardCreateInput,
  type KanbanCardUpdateInput,
  type KanbanStatus,
} from '@/features/kanban/types/kanbanCard'

const KANBAN_COLUMN_INDEX: Record<KanbanStatus, number> = Object.fromEntries(
  KANBAN_COLUMNS.map((column, index) => [column.status, index]),
) as Record<KanbanStatus, number>
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
import type { IStudyService } from './StudyService'

type DeckStats = Awaited<ReturnType<IStudyService['getDeckStats']>>[number]

export interface FakeStudyServiceState {
  decks: Deck[]
  modules: Module[]
  notes: Note[]
  promptTemplates: PromptTemplate[]
  letters: Letter[]
  kanbanCards: KanbanCard[]
  cards: Card[]
  browseFilters: BrowseFiltersResponse
  user: User
}

const defaultBrowseFilters: BrowseFiltersResponse = {
  totalCards: 0,
  sections: [],
}

const defaultUser: User = {
  id: 'user-1',
  nickname: 'tester',
  email: 'test@openflaskcards.app',
  isEmailVerified: true,
  provider: null,
  providers: null,
  fsrsParameters: [],
  desiredRetention: 0.9,
  optimizationStatus: null,
  lastOptimization: null,
  timezone: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

export class FakeStudyService implements IStudyService {
  decks: Deck[]
  modules: Module[]
  notes: Note[]
  promptTemplates: PromptTemplate[]
  letters: Letter[]
  kanbanCards: KanbanCard[]
  cards: Card[]
  browseFilters: BrowseFiltersResponse
  user: User

  constructor(initial: Partial<FakeStudyServiceState> = {}) {
    this.decks = initial.decks ?? []
    this.modules = initial.modules ?? []
    this.notes = initial.notes ?? []
    this.promptTemplates = initial.promptTemplates ?? []
    this.letters = initial.letters ?? []
    this.kanbanCards = initial.kanbanCards ?? []
    this.cards = initial.cards ?? []
    this.browseFilters = initial.browseFilters ?? defaultBrowseFilters
    this.user = initial.user ?? defaultUser
  }

  async getDecks(): Promise<Deck[]> {
    return [...this.decks]
  }

  async getDeckStats(): Promise<DeckStats[]> {
    return this.decks.map((deck) => ({
      deckId: deck.id,
      newCount: deck.newCount ?? 0,
      learningCount: deck.learnCount ?? 0,
      reviewCount: deck.reviewCount ?? 0,
      totalCards: this.cards.filter((card) => card.deckId === deck.id).length,
      newCardsStudiedToday: deck.newCardsStudiedToday ?? 0,
      newCardsDailyLimit: deck.newCardsDailyLimit ?? 10,
    }))
  }

  async getDeck(deckId: string): Promise<Deck> {
    const deck = this.decks.find((item) => item.id === deckId)
    if (!deck) throw new Error('Deck not found')
    return deck
  }

  async createDeck(data: DeckCreateInput): Promise<Deck> {
    const deck: Deck = {
      id: `deck-${this.decks.length + 1}`,
      name: data.name,
      description: data.description,
      tags: data.tags,
      moduleId: data.moduleId ?? null,
      userId: this.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      newCardsDailyLimit: data.newCardsDailyLimit ?? 10,
    }
    this.decks.push(deck)
    return deck
  }

  async updateDeck(deckId: string, data: DeckUpdateInput): Promise<Deck> {
    const index = this.decks.findIndex((deck) => deck.id === deckId)
    if (index === -1) throw new Error('Deck not found')
    this.decks[index] = {
      ...this.decks[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return this.decks[index]
  }

  async deleteDeck(deckId: string): Promise<void> {
    this.decks = this.decks.filter((deck) => deck.id !== deckId)
    this.cards = this.cards.filter((card) => card.deckId !== deckId)
  }

  async getModules(): Promise<Module[]> {
    return [...this.modules].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    )
  }

  async createModule(data: ModuleCreateInput): Promise<Module> {
    const moduleItem: Module = {
      id: `module-${this.modules.length + 1}`,
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
      promptModuleTypeId:
        data.promptModuleTypeId ?? DEFAULT_PROMPT_MODULE_TYPE_ID,
      userId: this.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.modules.push(moduleItem)
    return moduleItem
  }

  async updateModule(
    moduleId: string,
    data: ModuleUpdateInput,
  ): Promise<Module> {
    const index = this.modules.findIndex((module) => module.id === moduleId)
    if (index === -1) throw new Error('Module not found')
    this.modules[index] = {
      ...this.modules[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return this.modules[index]
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.modules = this.modules.filter((module) => module.id !== moduleId)
    this.decks = this.decks.map((deck) =>
      deck.moduleId === moduleId ? { ...deck, moduleId: null } : deck,
    )
  }

  async getNotes(): Promise<Note[]> {
    return [...this.notes].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )
  }

  async getNote(noteId: string): Promise<Note> {
    const note = this.notes.find((item) => item.id === noteId)
    if (!note) throw new Error('Note not found')
    return note
  }

  async createNote(data: NoteCreateInput): Promise<Note> {
    const note: Note = {
      id: `note-${this.notes.length + 1}`,
      title: data.title,
      content: data.content ?? '',
      userId: this.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.notes.push(note)
    return note
  }

  async updateNote(noteId: string, data: NoteUpdateInput): Promise<Note> {
    const index = this.notes.findIndex((note) => note.id === noteId)
    if (index === -1) throw new Error('Note not found')
    this.notes[index] = {
      ...this.notes[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return this.notes[index]
  }

  async deleteNote(noteId: string): Promise<void> {
    this.notes = this.notes.filter((note) => note.id !== noteId)
  }

  async getPromptTemplates(): Promise<PromptTemplate[]> {
    return [...this.promptTemplates].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )
  }

  async getPromptTemplate(templateId: string): Promise<PromptTemplate> {
    const template = this.promptTemplates.find((item) => item.id === templateId)
    if (!template) throw new Error('Prompt template not found')
    return template
  }

  async createPromptTemplate(
    data: PromptTemplateCreateInput,
  ): Promise<PromptTemplate> {
    const template: PromptTemplate = {
      id: `prompt-template-${this.promptTemplates.length + 1}`,
      name: data.name,
      body: data.body,
      userId: this.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.promptTemplates.push(template)
    return template
  }

  async updatePromptTemplate(
    templateId: string,
    data: PromptTemplateUpdateInput,
  ): Promise<PromptTemplate> {
    const index = this.promptTemplates.findIndex(
      (template) => template.id === templateId,
    )
    if (index === -1) throw new Error('Prompt template not found')
    this.promptTemplates[index] = {
      ...this.promptTemplates[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return this.promptTemplates[index]
  }

  async deletePromptTemplate(templateId: string): Promise<void> {
    this.promptTemplates = this.promptTemplates.filter(
      (template) => template.id !== templateId,
    )
  }

  async getLetters(): Promise<Letter[]> {
    return [...this.letters].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )
  }

  async getLetter(letterId: string): Promise<Letter> {
    const letter = this.letters.find((item) => item.id === letterId)
    if (!letter) throw new Error('Letter not found')
    return letter
  }

  async createLetter(data: LetterCreateInput): Promise<Letter> {
    const letter: Letter = {
      id: `letter-${this.letters.length + 1}`,
      userId: this.user.id,
      title: data.title,
      artist: data.artist ?? '',
      originalLyrics: data.originalLyrics ?? '',
      translation: data.translation ?? '',
      deckId: data.deckId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.letters.push(letter)
    return letter
  }

  async updateLetter(
    letterId: string,
    data: LetterUpdateInput,
  ): Promise<Letter> {
    const index = this.letters.findIndex((letter) => letter.id === letterId)
    if (index === -1) throw new Error('Letter not found')
    this.letters[index] = {
      ...this.letters[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return this.letters[index]
  }

  async deleteLetter(letterId: string): Promise<void> {
    this.letters = this.letters.filter((letter) => letter.id !== letterId)
  }

  private nextKanbanPosition(status: string): number {
    const inColumn = this.kanbanCards.filter((card) => card.status === status)
    return inColumn.length === 0
      ? 0
      : Math.max(...inColumn.map((card) => card.position)) + 1
  }

  async getKanbanCards(status?: string): Promise<KanbanCard[]> {
    return [...this.kanbanCards]
      .filter((card) => !status || card.status === status)
      .sort(
        (a, b) =>
          KANBAN_COLUMN_INDEX[a.status] - KANBAN_COLUMN_INDEX[b.status] ||
          a.position - b.position,
      )
  }

  async getKanbanCard(cardId: string): Promise<KanbanCard> {
    const card = this.kanbanCards.find((item) => item.id === cardId)
    if (!card) throw new Error('Kanban card not found')
    return card
  }

  async createKanbanCard(data: KanbanCardCreateInput): Promise<KanbanCard> {
    const status = data.status ?? 'backlog'
    const card: KanbanCard = {
      id: `kanban-${this.kanbanCards.length + 1}`,
      userId: this.user.id,
      title: data.title,
      description: data.description ?? '',
      status,
      priority: data.priority ?? 'medium',
      assignee: data.assignee ?? null,
      type: data.type ?? 'feature',
      position: this.nextKanbanPosition(status),
      verificationNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.kanbanCards.push(card)
    return card
  }

  async updateKanbanCard(
    cardId: string,
    data: KanbanCardUpdateInput,
  ): Promise<KanbanCard> {
    const index = this.kanbanCards.findIndex((card) => card.id === cardId)
    if (index === -1) throw new Error('Kanban card not found')
    const current = this.kanbanCards[index]
    const newStatus = data.status ?? current.status
    const statusChanged = newStatus !== current.status
    this.kanbanCards[index] = {
      ...current,
      ...data,
      assignee: data.assignee !== undefined ? data.assignee : current.assignee,
      position: statusChanged
        ? this.nextKanbanPosition(newStatus)
        : current.position,
      updatedAt: new Date().toISOString(),
    }
    return this.kanbanCards[index]
  }

  async deleteKanbanCard(cardId: string): Promise<void> {
    this.kanbanCards = this.kanbanCards.filter((card) => card.id !== cardId)
  }

  async pullNextKanbanCard(
    assignee: string = 'claude_code',
  ): Promise<KanbanCard> {
    const candidates = this.kanbanCards.filter((card) => card.status === 'todo')
    if (candidates.length === 0) throw new Error('No cards available in To Do')
    const next = candidates.reduce((a, b) => (a.position <= b.position ? a : b))
    return this.updateKanbanCard(next.id, {
      status: 'in_progress',
      assignee: assignee as KanbanAssignee,
    })
  }

  async getCards(deckId: string): Promise<Card[]> {
    return this.cards.filter((card) => card.deckId === deckId)
  }

  async getCard(cardId: string): Promise<Card> {
    const card = this.cards.find((item) => item.id === cardId)
    if (!card) throw new Error('Card not found')
    return card
  }

  async createCard(data: CardCreateInput): Promise<Card> {
    const card: Card = {
      id: `card-${this.cards.length + 1}`,
      deckId: data.deckId,
      front: data.front,
      back: data.back,
      fonetica: data.phonetic,
      imagemUrl: data.imagemUrl,
      stability: 0,
      difficulty: 0,
      due: new Date().toISOString(),
      state: 'new',
      reps: 0,
      lapses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttsEnabled: false,
    }
    this.cards.push(card)
    return card
  }

  async updateCard(cardId: string, data: CardUpdateInput): Promise<Card> {
    const index = this.cards.findIndex((card) => card.id === cardId)
    if (index === -1) throw new Error('Card not found')
    this.cards[index] = {
      ...this.cards[index],
      front: data.front ?? this.cards[index].front,
      back: data.back ?? this.cards[index].back,
      fonetica: data.phonetic ?? this.cards[index].phonetic,
      imagemUrl: data.imagemUrl ?? this.cards[index].imagemUrl,
      ttsEnabled: data.ttsEnabled ?? this.cards[index].ttsEnabled,
      updatedAt: new Date().toISOString(),
    }
    return this.cards[index]
  }

  async deleteCard(cardId: string): Promise<void> {
    this.cards = this.cards.filter((card) => card.id !== cardId)
  }

  async getBrowseFilters(): Promise<BrowseFiltersResponse> {
    return this.browseFilters
  }

  async getBrowseCards(query: BrowseCardsQuery = {}): Promise<Card[]> {
    if (query.filterType === 'deck' && query.filterValue) {
      return this.cards.filter((card) => card.deckId === query.filterValue)
    }
    return [...this.cards]
  }

  async bulkCreateCards(request: BulkImportRequest): Promise<ImportResult> {
    let created = 0
    for (const item of request.cards) {
      await this.createCard({
        deckId: request.deckId,
        front: item.front,
        back: item.back,
        fonetica: item.phonetic,
      })
      created += 1
    }
    return { created, failed: 0, errors: [] }
  }

  async exportDeckCards(deckId: string): Promise<ExportCardItem[]> {
    return this.cards
      .filter((card) => card.deckId === deckId)
      .map((card) => ({
        front: card.front,
        back: card.back,
        fonetica: card.phonetic,
      }))
  }

  async uploadImage(): Promise<{ url: string }> {
    return { url: '/media/fake.png' }
  }

  async getCardFront(cardId: string): Promise<CardFront> {
    const card = await this.getCard(cardId)
    return {
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      imagemUrl: card.imagemUrl,
      audioUrl: card.audioUrl,
      ttsEnabled: card.ttsEnabled,
      state: card.state,
      reps: card.reps,
    }
  }

  async getCardBack(cardId: string): Promise<CardBack> {
    const card = await this.getCard(cardId)
    return {
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
      fonetica: card.phonetic,
      imagemUrl: card.imagemUrl,
      stability: card.stability,
      difficulty: card.difficulty,
      due: card.due,
      state: card.state,
      reps: card.reps,
      lapses: card.lapses,
    }
  }

  async getCardAudio(): Promise<string> {
    return ''
  }

  async getDueCardsSummary(deckId: string): Promise<DueCardsSummary> {
    const deckCards = await this.getCards(deckId)
    const cards = await Promise.all(
      deckCards.map((card) => this.getCardFront(card.id)),
    )
    return {
      cards,
      totalDue: cards.length,
      newCardsDailyLimit: 10,
      newCardsStudiedToday: 0,
      remainingNewCardsToday: 10,
      isNewCardsLimitReached: false,
    }
  }

  async submitReview(
    cardId: string,
    rating: 1 | 2 | 3 | 4,
  ): Promise<ReviewResult> {
    const card = await this.getCard(cardId)
    return {
      cardId: card.id,
      state: rating >= 3 ? 'review' : 'learning',
      stability: card.stability,
      difficulty: card.difficulty,
      due: card.due,
      lastReview: card.lastReview,
      reps: card.reps + 1,
      lapses: card.lapses,
    }
  }

  async getReviewPreview(cardId: string): Promise<ReviewPreviewResponse> {
    return {
      cardId,
      currentRetrievability: 0.9,
      options: [],
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.user
  }

  async updateUser(data: Partial<User>): Promise<User> {
    this.user = { ...this.user, ...data }
    return this.user
  }

  async updateFSRSSettings(input: {
    desiredRetention?: number
    weights?: number[]
  }): Promise<User> {
    this.user = {
      ...this.user,
      ...(input.desiredRetention != null
        ? { desiredRetention: input.desiredRetention }
        : {}),
      ...(input.weights != null ? { fsrsParameters: input.weights } : {}),
    }
    return this.user
  }

  async optimizeFSRS(): Promise<{ status: string }> {
    this.user = {
      ...this.user,
      optimizationStatus: 'running',
    }
    return { status: 'running' }
  }
}
