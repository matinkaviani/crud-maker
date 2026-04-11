import { readStoredPayload, writeStoredPayload } from '@/lib/server/crud-persistence'
import { recordsFromPayload, writeRecordsToPayload, type CrudRecord } from '@/lib/crud-payload'

export async function GET(
  _request: Request,
  context: { params: Promise<{ schemaId: string }> }
) {
  const { schemaId } = await context.params
  const data = await readStoredPayload(schemaId)
  const body: Record<string, unknown> = { data }
  if (Array.isArray(data)) body.total = data.length
  else if (data !== null && typeof data === 'object') body.total = 1
  body.page = 1
  body.limit = 10
  return Response.json(body)
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

  const current = await readStoredPayload(schemaId)
  const records = recordsFromPayload(current)
  if (!records) {
    return Response.json(
      {
        error: 'Unsupported payload',
        message:
          'POST /create is only available when mock data is an array of objects with string id, or a single object with id',
      },
      { status: 400 }
    )
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : crypto.randomUUID()
  const { id: _drop, ...rest } = body
  const newItem: CrudRecord = { ...rest, id }

  const next = [...records, newItem]
  const stored = writeRecordsToPayload(current, next)
  await writeStoredPayload(schemaId, stored)

  return Response.json({ data: newItem, message: 'Created successfully' }, { status: 201 })
}
