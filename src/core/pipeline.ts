import type { RunConfig } from '../types/index.js'
import * as stateManager from '../state/stateManager.js'
import { getWorkQueue } from '../state/checkpointFilter.js'
import { waitUntil } from './scheduler.js'
import { connect } from '../whatsapp/connection.js'
import { attach } from '../whatsapp/statusTracker.js'
import { sendAll } from './sender.js'
import { generate } from '../report/reporter.js'
import { printSummary } from '../report/table.js'
import { logger } from '../utils/logger.js'

export async function run(config: RunConfig): Promise<void> {
  // 1. Load or create state
  const state = await stateManager.loadOrCreate(config)

  // 2. Build work queue
  const queue = getWorkQueue(state, config.resume)

  if (queue.length === 0) {
    logger.info('No contacts to process. All done.')
    printSummary(state)
    return
  }

  // 3. Wait for scheduled start time
  await waitUntil(config.schedule)

  // 4. Connect to WhatsApp
  const { sock, cleanup } = await connect()

  // Track in-flight message IDs for status updates
  const messageIdToJid = new Map<string, string>()

  // 5. Attach status tracker
  attach(sock, state, config.outputPath)

  // Register new message IDs as they're sent
  const onMessageSent = (messageId: string, jid: string) => {
    messageIdToJid.set(messageId, jid)
  }

  // Graceful shutdown handler
  let shutdownRequested = false
  const shutdown = async (signal: string) => {
    if (shutdownRequested) return
    shutdownRequested = true
    logger.info(`\n${signal} received — shutting down gracefully...`)

    stateManager.unconfirmedSweep(state, config.unconfirmedTimeoutMs)
    await stateManager.persist(state, config.outputPath)

    const reportPath = await generate(state, config.outputPath)
    printSummary(state)
    logger.info({ reportPath }, 'Partial report saved')

    await cleanup()
    process.exit(0)
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))

  // 6. Send all messages
  await sendAll(queue, config, sock, state, onMessageSent)

  if (shutdownRequested) return

  // 7. Mark still-pending 'sent' entries as unconfirmed (if past timeout)
  stateManager.unconfirmedSweep(state, config.unconfirmedTimeoutMs)
  await stateManager.persist(state, config.outputPath)

  // 9. Generate final report
  const reportPath = await generate(state, config.outputPath)
  printSummary(state)
  logger.info({ reportPath }, 'Final report saved')

  await cleanup()
  process.exit(0)
}
