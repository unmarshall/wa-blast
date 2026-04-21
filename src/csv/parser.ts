import { createReadStream } from 'node:fs'
import { parse } from 'csv-parse'
import type { Contact } from '../types/index.js'
import { toJid } from '../utils/phoneFormatter.js'
import { logger } from '../utils/logger.js'

export async function parseCSV(filePath: string): Promise<Contact[]> {
  const contacts: Contact[] = []
  const seenJids = new Set<string>()

  await new Promise<void>((resolve, reject) => {
    createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          trim: true,
          skip_empty_lines: true,
          bom: true,
        })
      )
      .on('data', (row: Record<string, string>) => {
        const name = (row['name'] ?? row['Name'] ?? '').trim()
        const phone = (row['phone'] ?? row['Phone'] ?? row['number'] ?? row['Number'] ?? '').trim()

        if (!phone) {
          logger.warn({ row }, 'Skipping row with empty phone')
          return
        }

        let jid: string
        try {
          jid = toJid(phone)
        } catch (err) {
          logger.warn({ phone, err }, 'Skipping row: invalid phone number')
          return
        }

        if (seenJids.has(jid)) {
          logger.warn({ phone, name }, 'Duplicate phone number — skipping')
          return
        }

        seenJids.add(jid)
        contacts.push({ name: name || phone, phone, jid })
      })
      .on('error', reject)
      .on('end', resolve)
  })

  return contacts
}
