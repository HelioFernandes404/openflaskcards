import type { TestUser, TestDeck, TestCard } from './types.js'

const API_BASE = 'http://localhost:3030/api/v1'
const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const

type JsonRecord = Record<string, unknown>
type SeederDeck = {
  id: string
  name: string
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const error = new Error(
      `Request failed with status ${response.status}`,
    ) as Error & { response?: { status: number; data: unknown } }
    error.response = { status: response.status, data }
    throw error
  }

  return data as T
}

function isConflictError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status ===
      'number' &&
    (error as { response?: { status?: number } }).response?.status === 400
  )
}

async function listDecks(): Promise<SeederDeck[]> {
  return requestJson<SeederDeck[]>('/decks', {
    method: 'GET',
  })
}

async function deleteDeck(deckId: string): Promise<void> {
  await requestJson(`/decks/${deckId}`, {
    method: 'DELETE',
  })
}

async function cleanupUserDecks(): Promise<void> {
  const decks = await listDecks()

  for (const deck of decks) {
    await deleteDeck(deck.id)
  }
}

// Default test data
export const TEST_USERS: TestUser[] = [
  {
    email: 'test-user@openflaskcards.app',
    password: 'Test123!',
    name: 'Test User',
    nickname: 'testuser',
  },
  {
    email: 'admin@openflaskcards.app',
    password: 'Admin123!',
    name: 'Admin User',
    nickname: 'admin',
  },
]

export const TEST_DECKS: Omit<TestDeck, 'id' | 'userId'>[] = [
  {
    name: 'JavaScript Basics',
    description: 'Fundamentos de JS',
    cardCount: 10,
  },
  {
    name: 'React Hooks',
    description: 'Hooks do React',
    cardCount: 5,
  },
  {
    name: 'Empty Deck',
    description: 'Deck sem cards',
    cardCount: 0,
  },
]

export const TEST_CARDS_TEMPLATES: Omit<TestCard, 'id' | 'deckId'>[] = [
  {
    front: 'O que é uma closure?',
    back: 'Função que tem acesso ao escopo externo',
    state: 'New',
    stability: 0,
    difficulty: 0,
  },
  {
    front: 'O que é hoisting?',
    back: 'Elevação de declarações para o topo do escopo',
    state: 'Learning',
    stability: 1.5,
    difficulty: 5,
  },
  {
    front: 'O que é event loop?',
    back: 'Mecanismo que gerencia execução assíncrona',
    state: 'Review',
    stability: 30,
    difficulty: 3,
  },
]

/**
 * Limpa todas as collections do MongoDB de teste
 */
export async function cleanDatabase(): Promise<void> {
  try {
    // Endpoint na API para limpar DB de teste
    await requestJson('/test/clean-database', {
      method: 'POST',
    })
    console.log('✓ Database cleaned')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error?.response?.status === 404) {
      await cleanupUserDecks()
      console.warn(
        '⚠ Warning: /test/clean-database endpoint not found. Falling back to deck cleanup.',
      )
    } else {
      console.error('✗ Failed to clean database:', error.message)
      throw error
    }
  }
}

/**
 * Populates the database with default test data
 */
export async function seedDatabase(): Promise<void> {
  try {
    // Cria decks
    const createdDecks: SeederDeck[] = []
    for (const deck of TEST_DECKS) {
      const response = await requestJson<SeederDeck>('/decks', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(deck),
      })
      createdDecks.push(response)
    }

    // Cria cards para os decks (exceto Empty Deck)
    for (let i = 0; i < createdDecks.length - 1; i++) {
      const deck = createdDecks[i]
      const cardsToCreate = deck.name === 'JavaScript Basics' ? 10 : 5

      for (let j = 0; j < cardsToCreate; j++) {
        const template = TEST_CARDS_TEMPLATES[j % TEST_CARDS_TEMPLATES.length]
        await requestJson('/cards', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            deckId: deck.id,
            front: `${template.front} (${j + 1})`,
            back: template.back,
          }),
        })
      }
    }

    console.log('✓ Database seeded successfully')
  } catch (error) {
    console.error('✗ Failed to seed database:', error)
    throw error
  }
}

/**
 * Returns test user credentials
 */
export function getTestUser(type: 'default' | 'admin' = 'default'): TestUser {
  return type === 'admin' ? TEST_USERS[1] : TEST_USERS[0]
}

/**
 * Executa seed quando chamado diretamente
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  ;(async () => {
    await cleanDatabase()
    await seedDatabase()
    process.exit(0)
  })()
}
