export type MessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'unconfirmed'

export interface Contact {
  name: string
  phone: string  // raw value from CSV
  jid: string    // "15551234567@s.whatsapp.net"
}

export interface MessageResult {
  name: string
  phone: string
  jid: string
  status: MessageStatus
  error?: string
  messageId?: string
  timestamp?: string
  deliveredAt?: string
  readAt?: string
}

export interface AppState {
  version: 1
  startedAt: string
  csvPath: string
  messageTemplate: string
  outputPath: string
  results: MessageResult[]
}

export interface RunConfig {
  csv: string
  messageTemplate: string
  schedule?: Date
  outputPath: string
  delayMin: number
  delayMax: number
  batchSize: number
  batchPauseMin: number
  batchPauseMax: number
  unconfirmedTimeoutMs: number
  resume: boolean
}

export interface FinalReport {
  generatedAt: string
  totalContacts: number
  succeeded: Pick<MessageResult, 'name' | 'phone' | 'status' | 'timestamp' | 'deliveredAt' | 'readAt'>[]
  failed: Pick<MessageResult, 'name' | 'phone' | 'status' | 'error' | 'timestamp'>[]
  unconfirmed: Pick<MessageResult, 'name' | 'phone' | 'status' | 'timestamp'>[]
}
