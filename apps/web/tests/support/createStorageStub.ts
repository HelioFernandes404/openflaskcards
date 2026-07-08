import { vi } from 'vitest'

export function createStorageStub(options?: { spy?: boolean }) {
  const store = new Map<string, string>()
  const getItem = (key: string) => store.get(key) ?? null
  const setItem = (key: string, value: string) => {
    store.set(key, value)
  }
  const removeItem = (key: string) => {
    store.delete(key)
  }
  const clear = () => store.clear()

  if (options?.spy) {
    return {
      getItem: vi.fn(getItem),
      setItem: vi.fn(setItem),
      removeItem: vi.fn(removeItem),
      clear: vi.fn(clear),
    }
  }

  return { getItem, setItem, removeItem, clear }
}
