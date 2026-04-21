import type { WASocket } from '@whiskeysockets/baileys'
import type { Contact, MessageResult } from '../types/index.js'
import { logger } from '../utils/logger.js'

export async function send(
  sock: WASocket,
  contact: Contact,
  text: string
): Promise<MessageResult> {
  const timestamp = new Date().toISOString()

  try {
    const sent = await sock.sendMessage(contact.jid, { text })

    if (!sent) {
      return {
        ...contact,
        status: 'failed',
        error: 'sendMessage returned undefined',
        timestamp,
      }
    }

    logger.info({ phone: contact.phone, messageId: sent.key.id }, 'Message sent')

    return {
      ...contact,
      status: 'sent',
      messageId: sent.key.id ?? undefined,
      timestamp,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logger.warn({ phone: contact.phone, error: errorMsg }, 'Failed to send message')

    return {
      ...contact,
      status: 'failed',
      error: errorMsg,
      timestamp,
    }
  }
}
