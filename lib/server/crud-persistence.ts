import { promises as fs } from 'fs'
import path from 'path'

export type CrudRecord = Record<string, unknown> & { id: string }

export interface FilterParams {
  // Field-based filters (any field name)
  [key: string]: string | string[] | undefined
  // Pagination
  page?: string
  limit?: string
  // Sorting
  sortBy?: string
  sortOrder?: string
  // Date range filters (format: fieldName_gte, fieldName_lte)
  // Search filter (searches all string fields)
  search?: string
}

export interface FilteredResult {
  data: CrudRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
  /** Validation warnings for filter parameters (non-fatal) */
  warnings?: string[]
  /** Applied filters summary for debugging */
  appliedFilters?: Record<string, string | string[]>
}

/**
 * Filter records based on query parameters
 * Supports:
 * - Exact match: ?field=value
 * - Multiple values (OR): ?field=value1&field=value2 or ?field=value1,value2
 * - Date range: ?field_gte=2024-01-01&field_lte=2024-12-31
 * - Numeric range: ?price_gte=100&price_lte=500
 * - Search across all string fields: ?search=term
 * - Boolean filter: ?active=true
 * - Pagination: ?page=1&limit=10
 * - Sorting: ?sortBy=fieldName&sortOrder=asc|desc
 */
export function filterRecords(
  records: CrudRecord[],
  params: FilterParams
): FilteredResult {
  let filtered = [...records]
  const warnings: string[] = []
  const appliedFilters: Record<string, string | string[]> = {}

  // Reserved params that aren't field filters
  const reservedParams = ['page', 'limit', 'sortBy', 'sortOrder', 'search']
  
  // Collect and validate date range parameters
  const dateRangeParams: Record<string, { gte?: string; lte?: string; gt?: string; lt?: string }> = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (!value || reservedParams.includes(key)) continue
    
    const suffixes = ['_gte', '_lte', '_gt', '_lt'] as const
    for (const suffix of suffixes) {
      if (key.endsWith(suffix)) {
        const fieldName = key.slice(0, -suffix.length)
        const rangeKey = suffix.slice(1) as 'gte' | 'lte' | 'gt' | 'lt'
        if (!dateRangeParams[fieldName]) {
          dateRangeParams[fieldName] = {}
        }
        dateRangeParams[fieldName][rangeKey] = Array.isArray(value) ? value[0] : value
      }
    }
  }
  
  // Validate date ranges
  for (const [fieldName, range] of Object.entries(dateRangeParams)) {
    const fromValue = range.gte || range.gt
    const toValue = range.lte || range.lt
    
    // Check if both from and to look like dates and validate range
    if (fromValue && toValue && (isDateLike(fromValue) || isDateLike(toValue))) {
      const error = validateDateRange(fromValue, toValue)
      if (error) {
        warnings.push(`${fieldName}: ${error}`)
      }
    }
  }
  
  function isDateLike(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(value)
  }

  // Global search across all string fields
  if (params.search) {
    const searchTerm = params.search.toLowerCase()
    appliedFilters['search'] = params.search
    filtered = filtered.filter((record) =>
      Object.values(record).some((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm)
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm)
        }
        return false
      })
    )
  }

  // Process field-based filters
  for (const [key, value] of Object.entries(params)) {
    if (reservedParams.includes(key) || value === undefined) continue

    // Handle range filters (field_gte, field_lte, field_gt, field_lt)
    if (key.endsWith('_gte')) {
      const fieldName = key.slice(0, -4)
      const filterValue = Array.isArray(value) ? value[0] : value
      appliedFilters[key] = filterValue
      filtered = filtered.filter((record) => {
        const fieldValue = record[fieldName]
        if (fieldValue === undefined || fieldValue === null) return false
        return compareValues(fieldValue, filterValue, '>=')
      })
      continue
    }
    if (key.endsWith('_lte')) {
      const fieldName = key.slice(0, -4)
      const filterValue = Array.isArray(value) ? value[0] : value
      appliedFilters[key] = filterValue
      filtered = filtered.filter((record) => {
        const fieldValue = record[fieldName]
        if (fieldValue === undefined || fieldValue === null) return false
        return compareValues(fieldValue, filterValue, '<=')
      })
      continue
    }
    if (key.endsWith('_gt')) {
      const fieldName = key.slice(0, -3)
      const filterValue = Array.isArray(value) ? value[0] : value
      appliedFilters[key] = filterValue
      filtered = filtered.filter((record) => {
        const fieldValue = record[fieldName]
        if (fieldValue === undefined || fieldValue === null) return false
        return compareValues(fieldValue, filterValue, '>')
      })
      continue
    }
    if (key.endsWith('_lt')) {
      const fieldName = key.slice(0, -3)
      const filterValue = Array.isArray(value) ? value[0] : value
      appliedFilters[key] = filterValue
      filtered = filtered.filter((record) => {
        const fieldValue = record[fieldName]
        if (fieldValue === undefined || fieldValue === null) return false
        return compareValues(fieldValue, filterValue, '<')
      })
      continue
    }

    // Handle exact match or multiple values (OR condition)
    const values = Array.isArray(value) ? value : value.split(',').map((v) => v.trim())
    appliedFilters[key] = values.length === 1 ? values[0] : values
    
    filtered = filtered.filter((record) => {
      const fieldValue = record[key]
      if (fieldValue === undefined || fieldValue === null) return false

      // Boolean handling
      if (typeof fieldValue === 'boolean') {
        return values.some((v) => {
          const boolVal = v.toLowerCase()
          return (boolVal === 'true' && fieldValue === true) ||
                 (boolVal === 'false' && fieldValue === false)
        })
      }

      // String or number matching
      return values.some((v) => {
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase() === v.toLowerCase()
        }
        if (typeof fieldValue === 'number') {
          return fieldValue === parseFloat(v)
        }
        return String(fieldValue) === v
      })
    })
  }

  // Get total before pagination
  const total = filtered.length

  // Sorting
  if (params.sortBy) {
    const sortField = params.sortBy
    const sortOrder = params.sortOrder?.toLowerCase() === 'desc' ? -1 : 1

    filtered.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortOrder
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortOrder
      }
      // Date comparison
      if (isDateString(aVal) && isDateString(bVal)) {
        return (new Date(aVal).getTime() - new Date(bVal).getTime()) * sortOrder
      }
      return 0
    })
  }

  // Pagination
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '10', 10) || 10))
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit

  filtered = filtered.slice(startIndex, startIndex + limit)

  const result: FilteredResult = {
    data: filtered,
    total,
    page,
    limit,
    totalPages,
  }
  
  // Only include warnings if there are any
  if (warnings.length > 0) {
    result.warnings = warnings
  }
  
  // Only include applied filters if any were used
  if (Object.keys(appliedFilters).length > 0) {
    result.appliedFilters = appliedFilters
  }
  
  return result
}

function compareValues(fieldValue: unknown, compareValue: string, operator: '>=' | '<=' | '>' | '<'): boolean {
  // Try date comparison first if either looks like a date
  if (isDateString(fieldValue) || isDateString(compareValue)) {
    const dateField = parseDateValue(String(fieldValue))
    const dateCompare = parseDateValue(compareValue)
    if (!isNaN(dateField) && !isNaN(dateCompare)) {
      switch (operator) {
        case '>=': return dateField >= dateCompare
        case '<=': return dateField <= dateCompare
        case '>': return dateField > dateCompare
        case '<': return dateField < dateCompare
      }
    }
  }

  // Try to parse as number
  const numField = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue))
  const numCompare = parseFloat(compareValue)

  if (!isNaN(numField) && !isNaN(numCompare)) {
    switch (operator) {
      case '>=': return numField >= numCompare
      case '<=': return numField <= numCompare
      case '>': return numField > numCompare
      case '<': return numField < numCompare
    }
  }

  // Fall back to string comparison
  const strField = String(fieldValue)
  switch (operator) {
    case '>=': return strField >= compareValue
    case '<=': return strField <= compareValue
    case '>': return strField > compareValue
    case '<': return strField < compareValue
  }
}

/**
 * Check if a value looks like a date string
 * Supports multiple formats: ISO, US (MM/DD/YYYY), EU (DD/MM/YYYY), etc.
 */
function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false
  // Check for ISO date format or common date patterns
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/
  const usPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/
  const euPattern = /^\d{1,2}-\d{1,2}-\d{4}$/
  return isoPattern.test(value) || usPattern.test(value) || euPattern.test(value)
}

/**
 * Parse a date string into a timestamp, supporting multiple formats
 * Returns NaN if the date is invalid
 */
function parseDateValue(value: string): number {
  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  const isoPattern = /^\d{4}-\d{2}-\d{2}/
  if (isoPattern.test(value)) {
    return new Date(value).getTime()
  }
  
  // Try US format (MM/DD/YYYY)
  const usPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  const usMatch = value.match(usPattern)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime()
  }
  
  // Try EU format (DD-MM-YYYY)
  const euPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  const euMatch = value.match(euPattern)
  if (euMatch) {
    const [, day, month, year] = euMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime()
  }
  
  // Fallback to Date.parse
  return Date.parse(value)
}

/**
 * Validate a date range (from <= to)
 * Returns an error message if invalid, null if valid
 */
export function validateDateRange(from: string | undefined, to: string | undefined): string | null {
  if (!from && !to) return null
  
  if (from) {
    const fromTime = parseDateValue(from)
    if (isNaN(fromTime)) {
      return `Invalid 'from' date format: ${from}. Use YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY`
    }
  }
  
  if (to) {
    const toTime = parseDateValue(to)
    if (isNaN(toTime)) {
      return `Invalid 'to' date format: ${to}. Use YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY`
    }
  }
  
  if (from && to) {
    const fromTime = parseDateValue(from)
    const toTime = parseDateValue(to)
    if (fromTime > toTime) {
      return `Invalid date range: 'from' date (${from}) is after 'to' date (${to})`
    }
  }
  
  return null
}

const DATA_DIR = path.join(process.cwd(), 'data', 'crud-mock')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function filePath(schemaId: string) {
  return path.join(DATA_DIR, `${schemaId}.json`)
}

export async function readCollection(schemaId: string): Promise<CrudRecord[]> {
  await ensureDir()
  try {
    const raw = await fs.readFile(filePath(schemaId), 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as CrudRecord[]
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return []
    throw e
  }
}

export async function writeCollection(schemaId: string, items: CrudRecord[]): Promise<void> {
  await ensureDir()
  await fs.writeFile(filePath(schemaId), JSON.stringify(items, null, 2), 'utf-8')
}
