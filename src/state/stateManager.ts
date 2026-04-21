import { readFile, writeFile, rename, copyFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { AppState, MessageResult, RunConfig } from '../types/index.js'
import { parseCSV } from '../csv/parser.js'
import { logger } from '../utils/logger.js'

export async function loadOrCreate(config: RunConfig): Promise<AppState> {
  if (config.resume && existsSync(config.outputPath)) {
    logger.info({ path: config.outputPath }, 'Resuming from existing state file')
    const raw = await readFile(config.outputPath, 'utf8')
    const existing: AppState = JSON.parse(raw)

    // Merge fresh CSV contacts — add any new entries not already in state
    const freshContacts = await parseCSV(config.csv)
    const existingJids = new Set(existing.results.map(r => r.jid))

    for (const contact of freshContacts) {
      if (!existingJids.has(contact.jid)) {
        logger.info({ phone: contact.phone }, 'New contact found in CSV — adding as pending')
        existing.results.push({
          name: contact.name,
          phone: contact.phone,
          jid: contact.jid,
          status: 'pending',
        })
      }
    }

    return existing
  }

  // Fresh run
  const contacts = await parseCSV(config.csv)
  const state: AppState = {
    version: 1,
    startedAt: new Date().toISOString(),
    csvPath: config.csv,
    messageTemplate: config.messageTemplate,
    outputPath: config.outputPath,
    results: contacts.map(c => ({
      name: c.name,
      phone: c.phone,
      jid: c.jid,
      status: 'pending',
    })),
  }

  await persist(state, config.outputPath)
  return state
}

export async function persist(state: AppState, outputPath: string): Promise<void> {
  const tmp = outputPath + '.tmp'
  await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8')
  try {
    await rename(tmp, outputPath)
  } catch (err) {
    // rename() fails on Windows when source and destination are on different drives (EXDEV)
    // fall back to copy + delete which works everywhere
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      await copyFile(tmp, outputPath)
      await unlink(tmp)
    } else {
      throw err
    }
  }
}

export function updateResult(state: AppState, result: MessageResult): void {
  const idx = state.results.findIndex(r => r.jid === result.jid)
  if (idx >= 0) {
    state.results[idx] = result
  }
}

export function unconfirmedSweep(state: AppState, timeoutMs: number): void {
  const now = Date.now()
  for (const result of state.results) {
    if (result.status === 'sent' && result.timestamp) {
      const sentAt = new Date(result.timestamp).getTime()
      if (now - sentAt > timeoutMs) {
        result.status = 'unconfirmed'
      }
    }
  }
}
