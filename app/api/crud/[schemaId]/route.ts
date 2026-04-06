import { readCollection, writeCollection, filterRecords, type CrudRecord, type FilterParams } from '@/lib/server/crud-persistence'

export async function GET(
  request: Request,
  context: { params: Promise<{ schemaId: string }> }
) {
  const { schemaId } = await context.params
  const data = await readCollection(schemaId)
  
  // Parse query parameters for filtering
  const url = new URL(request.url)
  const params: FilterParams = {}
  
  url.searchParams.forEach((value, key) => {
    // Handle multiple values for the same key (e.g., ?status=active&status=pending)
    const existing = params[key]
    if (existing) {
      params[key] = Array.isArray(existing) 
        ? [...existing, value] 
        : [existing, value]
    } else {
      params[key] = value
    }
  })
  
  // Apply filtering, sorting, and pagination
  const result = filterRecords(data, params)
  
  return Response.json(result)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ schemaId: string }> }
) {
  const { schemaId } = await context.params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json(
      { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
      { status: 400 }
    )
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : crypto.randomUUID()
  const { id: _drop, ...rest } = body
  const newItem: CrudRecord = { ...rest, id }

  const items = await readCollection(schemaId)
  items.push(newItem)
  await writeCollection(schemaId, items)

  return Response.json({ data: newItem, message: 'Created successfully' }, { status: 201 })
}
