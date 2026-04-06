import { promises as fs } from 'fs'
import path from 'path'

export type CrudRecord = Record<string, unknown> & { id: string }

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
