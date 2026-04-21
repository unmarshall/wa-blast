import type { WASocket } from '@whiskeysockets/baileys'
import type { Contact, AppState, RunConfig } from '../types/index.js'
import { render } from '../utils/templateEngine.js'
import { randomDelay, longPause } from '../utils/delay.js'
import { send } from './messenger.js'
import { updateResult, persist } from '../state/stateManager.js'
import { logger } from '../utils/logger.js'

export async function sendAll(
  queue: Contact[],
  config: RunConfig,
  sock: WASocket,
  state: AppState,
  onMessageSent?: (messageId: string, jid: string) => void
): Promise<void> {
  let sentThisBatch = 0
  const total = queue.length

  for (let i = 0; i < total; i++) {
    const contact = queue[i]!
    const text = render(config.messageTemplate, contact)

    logger.info({ phone: contact.phone, name: contact.name, progress: `${i + 1}/${total}` }, 'Sending...')

    const result = await send(sock, contact, text)
    updateResult(state, result)
    await persist(state, config.outputPath)

    if (result.messageId && onMessageSent) {
      onMessageSent(result.messageId, contact.jid)
    }

    sentThisBatch++
    const isLast = i === total - 1

    if (!isLast) {
      if (sentThisBatch >= config.batchSize) {
        sentThisBatch = 0
        await longPause(config.batchPauseMin, config.batchPauseMax)
      } else {
        await randomDelay(config.delayMin, config.delayMax)
      }
    }
  }

  logger.info(`Send loop complete. ${total} messages attempted.`)
}
