import type { AppState, Contact } from '../types/index.js'
import { logger } from '../utils/logger.js'

export function getWorkQueue(state: AppState, resume: boolean): Contact[] {
  const retryStatuses = new Set(['pending', 'failed'])
  const skipStatuses = new Set(['sent', 'delivered', 'read', 'unconfirmed'])

  const queue: Contact[] = []
  let skipped = 0

  for (const result of state.results) {
    if (resume && skipStatuses.has(result.status)) {
      skipped++
      continue
    }
    if (retryStatuses.has(result.status) || (!resume && result.status !== 'pending' && result.status !== 'failed')) {
      queue.push({ name: result.name, phone: result.phone, jid: result.jid })
    } else if (result.status === 'pending' || result.status === 'failed') {
      queue.push({ name: result.name, phone: result.phone, jid: result.jid })
    }
  }

  if (skipped > 0) {
    logger.info(`Skipping ${skipped} already-completed contacts (resume mode)`)
  }
  logger.info(`Work queue: ${queue.length} contacts to process`)

  return queue
}
