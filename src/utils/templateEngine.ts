import type { Contact } from '../types/index.js'

/**
 * Replaces {name} and {phone} placeholders in the message template.
 */
export function render(template: string, contact: Contact): string {
  return template
    .replace(/\{name\}/g, contact.name)
    .replace(/\{phone\}/g, contact.phone)
}
