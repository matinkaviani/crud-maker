export type CrudRecord = Record<string, unknown> & { id: string }

/**
 * When the stored payload is a list of records (array of objects with string id),
 * or a single object with string id, return that list for CRUD by id.
 * Otherwise CRUD by id is not available (primitives, arrays of non-objects, etc.).
 */
export function recordsFromPayload(value: unknown): CrudRecord[] | null {
  if (Array.isArray(value)) {
    const out: CrudRecord[] = []
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const id = (item as Record<string, unknown>).id
      if (typeof id !== 'string' || !id) return null
      out.push(item as CrudRecord)
    }
    return out
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const id = (value as Record<string, unknown>).id
    if (typeof id === 'string' && id) return [value as CrudRecord]
    return null
  }
  return null
}

export function writeRecordsToPayload(
  current: unknown,
  nextRecords: CrudRecord[]
): unknown {
  if (Array.isArray(current)) return nextRecords
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    if (nextRecords.length <= 1) return nextRecords[0] ?? null
    return nextRecords
  }
  return nextRecords
}
