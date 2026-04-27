import type { WASocket } from '@whiskeysockets/baileys'
import type { AppState, MessageResult } from '../types/index.js'
import { persist } from '../state/stateManager.js'
import { logger } from '../utils/logger.js'

// Baileys proto status numeric values (stable constants from proto.WebMessageInfo.Status)
const STATUS_DELIVERED = 2  // DELIVERY_ACK
const STATUS_READ = 3       // READ
const STATUS_PLAYED = 4     // PLAYED

export function attach(
  sock: WASocket,
  state: AppState,
  outputPath: string
): void {
  // Build reverse lookup: messageId → result index
  const messageIdIndex = new Map<string, number>()
  const rebuildIndex = () => {
    messageIdIndex.clear()
    for (const [i, r] of state.results.entries()) {
      if (r.messageId) messageIdIndex.set(r.messageId, i)
    }
  }
  rebuildIndex()

  // Called whenever a new result is added so the index stays current
  const registerMessageId = (messageId: string, jid: string) => {
    const idx = state.results.findIndex(r => r.jid === jid)
    if (idx >= 0) messageIdIndex.set(messageId, idx)
  }

  sock.ev.on('messages.update', async (updates) => {
    let changed = false

    for (const { key, update } of updates) {
      if (!key.id || !update.status) continue
      const idx = messageIdIndex.get(key.id)
      if (idx === undefined) continue

      const current = state.results[idx] as MessageResult
      const newStatus = update.status

      if ((newStatus === STATUS_READ || newStatus === STATUS_PLAYED) && current.status !== 'read') {
        state.results[idx] = { ...current, status: 'read', readAt: new Date().toISOString() }
        logger.info({ phone: current.phone }, 'Message read')
        changed = true
      } else if (newStatus === STATUS_DELIVERED && current.status === 'sent') {
        state.results[idx] = { ...current, status: 'delivered', deliveredAt: new Date().toISOString() }
        logger.info({ phone: current.phone }, 'Message delivered')
        changed = true
      }
    }

    if (changed) {
      await persist(state, outputPath).catch(err => logger.error({ err }, 'Failed to persist status update'))
    }
  })

  sock.ev.on('message-receipt.update', async (receipts) => {
    let changed = false

    for (const { key, receipt } of receipts) {
      if (!key.id) continue
      const idx = messageIdIndex.get(key.id)
      if (idx === undefined) continue

      const current = state.results[idx] as MessageResult

      if (receipt.readTimestamp != null && current.status !== 'read') {
        const readTs = typeof receipt.readTimestamp === 'number'
          ? receipt.readTimestamp * 1000
          : Number(receipt.readTimestamp) * 1000
        state.results[idx] = {
          ...current,
          status: 'read',
          readAt: new Date(readTs).toISOString(),
        }
        logger.info({ phone: current.phone }, 'Message read (receipt)')
        changed = true
      } else if (receipt.receiptTimestamp != null && current.status === 'sent') {
        const ts = typeof receipt.receiptTimestamp === 'number'
          ? receipt.receiptTimestamp * 1000
          : Number(receipt.receiptTimestamp) * 1000
        state.results[idx] = {
          ...current,
          status: 'delivered',
          deliveredAt: new Date(ts).toISOString(),
        }
        logger.info({ phone: current.phone }, 'Message delivered (receipt)')
        changed = true
      }
    }

    if (changed) {
      await persist(state, outputPath).catch(err => logger.error({ err }, 'Failed to persist receipt update'))
    }
  })
}
