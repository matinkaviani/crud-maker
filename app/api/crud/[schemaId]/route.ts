import { readCollection, writeCollection, type CrudRecord } from '@/lib/server/crud-persistence'

export async function GET(
  _request: Request,
  context: { params: Promise<{ schemaId: string }> }
) {
  const { schemaId } = await context.params
  const data = await readCollection(schemaId)
  return Response.json({ data, total: data.length, page: 1, limit: 10 })
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
