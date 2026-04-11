import { writeStoredPayload } from '@/lib/server/crud-persistence'

/** Replaces server-side stored JSON with the client mock payload (any JSON value). */
export async function POST(
  request: Request,
  context: { params: Promise<{ schemaId: string }> }
) {
  const { schemaId } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let payload: unknown
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const rec = body as Record<string, unknown>
    if ('data' in rec) {
      payload = rec.data
    } else if (Array.isArray(rec.items)) {
      payload = rec.items
    } else {
      payload = body
    }
  } else {
    payload = body
  }

  await writeStoredPayload(schemaId, payload)
  return Response.json({ ok: true })
}
