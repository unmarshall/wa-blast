import makeWASocket, {
  DisconnectReason,
  Browsers,
  fetchLatestWaWebVersion,
  type WASocket,
} from '@whiskeysockets/baileys'
import qrcodeTerminal from 'qrcode-terminal'
import { getAuthState, clearSession } from './session.js'
import { logger } from '../utils/logger.js'

const CONNECT_TIMEOUT_MS = 90_000

export interface WAConnection {
  sock: WASocket
  cleanup: () => Promise<void>
}

export async function connect(): Promise<WAConnection> {
  // Fetch latest WA Web version to avoid version-mismatch rejections
  const { version, isLatest } = await fetchLatestWaWebVersion({})
  logger.info({ version: version.join('.'), isLatest }, 'WA Web version')

  return new Promise<WAConnection>((resolve, reject) => {
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('Connection timeout — QR not scanned within 90 seconds'))
      }
    }, CONNECT_TIMEOUT_MS)

    async function createSocket() {
      const { state, saveCreds } = await getAuthState()

      const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.macOS('Chrome'),
        logger: logger.child({ module: 'baileys' }, { level: 'silent' }),
        getMessage: async () => undefined,
      })

      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          console.log('\nScan this QR code with WhatsApp → Linked Devices → Link a Device:\n')
          qrcodeTerminal.generate(qr, { small: true }, (code) => {
            console.log(code)
          })
        }

        if (connection === 'open') {
          if (!settled) {
            settled = true
            clearTimeout(timeout)
            logger.info('WhatsApp connected successfully')
            resolve({
              sock,
              cleanup: async () => {
                try { sock.end(undefined) } catch { /* ignore */ }
              },
            })
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode
          const loggedOut = statusCode === DisconnectReason.loggedOut

          if (loggedOut) {
            logger.warn('Session logged out — clearing stale session and restarting QR flow...')
            clearSession()
              .then(() => createSocket())
              .catch(err => {
                if (!settled) {
                  settled = true
                  clearTimeout(timeout)
                  reject(err)
                }
              })
          } else {
            // All other close reasons (515 restartRequired, 408 timedOut, etc.)
            // require creating a brand-new socket — Baileys does NOT auto-reconnect
            logger.warn({ statusCode }, 'Connection closed — reconnecting...')
            createSocket().catch(err => {
              if (!settled) {
                settled = true
                clearTimeout(timeout)
                reject(err)
              }
            })
          }
        }
      })
    }

    createSocket().catch(err => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(err)
      }
    })
  })
}
