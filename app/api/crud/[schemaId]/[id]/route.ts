import { readStoredPayload, writeStoredPayload } from '@/lib/server/crud-persistence'
import { recordsFromPayload, writeRecordsToPayload, type CrudRecord } from '@/lib/crud-payload'

export async function GET(
  _request: Request,
  context: { params: Promise<{ schemaId: string; id: string }> }
) {
  const { schemaId, id } = await context.params
  const current = await readStoredPayload(schemaId)
  const records = recordsFromPayload(current)
  if (!records) {
    return Response.json(
      { error: 'Not supported', message: 'GET by id requires list or single-object mock data with id' },
      { status: 404 }
    )
  }
  const item = records.find((d) => d.id === id)
  if (!item) {
    return Response.json(
      { error: 'Not found', message: `Item with id ${id} not found` },
      { status: 404 }
    )
  }
  return Response.json({ data: item })
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ schemaId: string; id: string }> }
) {
  const { schemaId, id } = await context.params
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
      { error: 'Not supported', message: 'PUT by id requires list or single-object mock data with id' },
      { status: 400 }
    )
  }

  const idx = records.findIndex((d) => d.id === id)
  if (idx === -1) {
    return Response.json(
      { error: 'Not found', message: `Item with id ${id} not found` },
      { status: 404 }
    )
  }

  const merged: CrudRecord = { ...records[idx], ...body, id }
  const next = [...records]
  next[idx] = merged
  const stored = writeRecordsToPayload(current, next)
  await writeStoredPayload(schemaId, stored)

  return Response.json({ data: merged, message: 'Updated successfully' })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ schemaId: string; id: string }> }
) {
  const { schemaId, id } = await context.params
  const current = await readStoredPayload(schemaId)
  const records = recordsFromPayload(current)
  if (!records) {
    return Response.json(
      { error: 'Not supported', message: 'DELETE by id requires list or single-object mock data with id' },
      { status: 400 }
    )
  }

  const next = records.filter((d) => d.id !== id)
  if (next.length === records.length) {
    return Response.json(
      { error: 'Not found', message: `Item with id ${id} not found` },
      { status: 404 }
    )
  }
  const stored = writeRecordsToPayload(current, next)
  await writeStoredPayload(schemaId, stored)
  return Response.json({ message: 'Deleted successfully' })
}
