import { readCollection, writeCollection, type CrudRecord } from '@/lib/server/crud-persistence'

export async function GET(
  _request: Request,
  context: { params: Promise<{ schemaId: string; id: string }> }
) {
  const { schemaId, id } = await context.params
  const items = await readCollection(schemaId)
  const item = items.find((d) => d.id === id)
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

  const items = await readCollection(schemaId)
  const idx = items.findIndex((d) => d.id === id)
  if (idx === -1) {
    return Response.json(
      { error: 'Not found', message: `Item with id ${id} not found` },
      { status: 404 }
    )
  }

  const merged: CrudRecord = { ...items[idx], ...body, id }
  items[idx] = merged
  await writeCollection(schemaId, items)

  return Response.json({ data: merged, message: 'Updated successfully' })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ schemaId: string; id: string }> }
) {
  const { schemaId, id } = await context.params
  const items = await readCollection(schemaId)
  const next = items.filter((d) => d.id !== id)
  if (next.length === items.length) {
    return Response.json(
      { error: 'Not found', message: `Item with id ${id} not found` },
      { status: 404 }
    )
  }
  await writeCollection(schemaId, next)
  return Response.json({ message: 'Deleted successfully' })
}
