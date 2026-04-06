'use client'

import type { MockDataItem } from '@/lib/crud-types'

export async function syncMockDataToServer(schemaId: string, items: MockDataItem[]): Promise<void> {
  const res = await fetch(`/api/crud/${schemaId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sync failed: ${res.status} ${text}`)
  }
}
