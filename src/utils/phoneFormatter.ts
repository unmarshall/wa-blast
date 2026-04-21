/**
 * Converts a phone number string to a WhatsApp JID.
 * Input: E.164 format preferred (e.g. +15551234567 or 15551234567)
 * Output: "15551234567@s.whatsapp.net"
 *
 * Strips all non-digit characters, removes leading +.
 * If 10-digit number and WA_BLAST_COUNTRY_CODE is set, prepends it (default: no prefix).
 */
export function toJid(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')

  if (digits.length === 0) {
    throw new Error(`Invalid phone number: "${rawPhone}"`)
  }

  // If 10 digits and env country code set, prepend it
  let normalized = digits
  if (digits.length === 10) {
    const countryCode = process.env['WA_BLAST_COUNTRY_CODE']
    if (countryCode) {
      normalized = countryCode.replace(/\D/g, '') + digits
    }
  }

  return `${normalized}@s.whatsapp.net`
}

export function jidToPhone(jid: string): string {
  return jid.replace('@s.whatsapp.net', '')
}
