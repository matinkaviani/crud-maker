import { writeCollection, type CrudRecord } from '@/lib/server/crud-persistence'

/** Replaces the server-side collection with the client mock dataset (same as UI). */
export async function POST(
  request: Request,
  context: { params: Promise<{ schemaId: string }> }
) {
  const { schemaId } = await context.params
  let body: { items?: unknown }
  try {
    body = (await request.json()) as { items?: unknown }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.items)) {
    return Response.json({ error: 'Body must include an "items" array' }, { status: 400 })
  }

  const items: CrudRecord[] = []
  for (const item of body.items) {
    if (!item || typeof item !== 'object') {
      return Response.json({ error: 'Each item must be an object' }, { status: 400 })
    }
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id) {
      return Response.json({ error: 'Each item must have a string id' }, { status: 400 })
    }
    items.push(o as CrudRecord)
  }

  await writeCollection(schemaId, items)
  return Response.json({ ok: true, count: items.length })
}
