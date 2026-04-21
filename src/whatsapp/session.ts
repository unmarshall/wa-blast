import { mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { useMultiFileAuthState } from '@whiskeysockets/baileys'

export const SESSION_DIR = join(homedir(), '.wa-blast', 'session')

export async function getAuthState() {
  await mkdir(SESSION_DIR, { recursive: true })
  return useMultiFileAuthState(SESSION_DIR)
}

export async function clearSession() {
  await rm(SESSION_DIR, { recursive: true, force: true })
}
