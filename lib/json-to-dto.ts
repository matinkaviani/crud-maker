import JSON5 from 'json5'
import type { DTOField, FieldType } from '@/lib/crud-types'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isIsoLikeDate(s: string): boolean {
  if (s.length < 8) return false
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return true
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true
  return false
}

function isEmailLike(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function inferFieldType(value: unknown): FieldType {
  if (value === null || value === undefined) {
    return 'string'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return 'number'
  }
  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return 'uuid'
    if (isIsoLikeDate(value)) return 'date'
    if (isEmailLike(value)) return 'email'
    return 'string'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'object') {
    return 'object'
  }
  return 'string'
}

function extractShape(parsed: unknown): Record<string, unknown> {
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>
  }
  if (
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    parsed[0] !== null &&
    typeof parsed[0] === 'object' &&
    !Array.isArray(parsed[0])
  ) {
    return parsed[0] as Record<string, unknown>
  }
  throw new Error('Use a JSON object { ... } or a non-empty array of objects [ { ... } ]')
}

export function inferDtoFieldsFromJson(json: string): { ok: true; fields: Omit<DTOField, 'id'>[] } | { ok: false; error: string } {
  let parsed: unknown
  try {
    /** JSON5 accepts strict JSON plus single-quoted strings, trailing commas, etc. */
    parsed = JSON5.parse(json.trim())
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'parse error'
    return {
      ok: false,
      error: `Could not parse: ${detail}. Use valid JSON (double quotes) or JSON5 (single-quoted strings are OK).`,
    }
  }

  let shape: Record<string, unknown>
  try {
    shape = extractShape(parsed)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not read shape from JSON' }
  }

  const keys = Object.keys(shape)
  if (keys.length === 0) {
    return { ok: false, error: 'Object has no properties to infer fields from.' }
  }

  const fields: Omit<DTOField, 'id'>[] = keys.map((name) => {
    const value = shape[name]
    const type = inferFieldType(value)
    const required = value !== null && value !== undefined
    return {
      name,
      type,
      required,
    }
  })

  return { ok: true, fields }
}

export function dtoFieldsWithIds(fieldDefs: Omit<DTOField, 'id'>[]): DTOField[] {
  return fieldDefs.map((f) => ({ ...f, id: crypto.randomUUID() }))
}
