'use client'

export async function syncMockDataToServer(schemaId: string, data: unknown): Promise<void> {
  const res = await fetch(`/api/crud/${schemaId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sync failed: ${res.status} ${text}`)
  }
}
