import type { MockDataItem } from '@/lib/crud-types'

export type MockDataEditorMode = 'table' | 'json'

/** Table mode only when the payload is an array of objects each with a string `id`. */
export function inferMockEditorMode(value: unknown): MockDataEditorMode {
  if (!Array.isArray(value)) return 'json'
  if (
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        ((item as Record<string, unknown>).id as string).length > 0
    )
  ) {
    return 'table'
  }
  return 'json'
}

export function asMockTableRows(value: unknown): MockDataItem[] {
  if (!Array.isArray(value)) return []
  return value as MockDataItem[]
}
