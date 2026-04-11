import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'crud-mock')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function filePath(schemaId: string) {
  return path.join(DATA_DIR, `${schemaId}.json`)
}

/** Read whatever JSON was last synced (array, object, primitive, …). */
export async function readStoredPayload(schemaId: string): Promise<unknown> {
  await ensureDir()
  try {
    const raw = await fs.readFile(filePath(schemaId), 'utf-8')
    return JSON.parse(raw) as unknown
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return []
    throw e
  }
}

export async function writeStoredPayload(schemaId: string, value: unknown): Promise<void> {
  await ensureDir()
  await fs.writeFile(filePath(schemaId), JSON.stringify(value, null, 2), 'utf-8')
}
