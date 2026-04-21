import { logger } from '../utils/logger.js'

/**
 * Parses the --schedule argument.
 * Accepts:
 *   - ISO 8601: "2025-12-01T14:30:00"
 *   - HH:MM (24h): "14:30" → today at 14:30 local time
 *     If that time has already passed today, schedules for tomorrow.
 */
export function parseScheduleArg(input: string): Date {
  // Try ISO 8601
  const isoDate = new Date(input)
  if (!isNaN(isoDate.getTime())) return isoDate

  // Try HH:MM
  const hmMatch = input.match(/^(\d{1,2}):(\d{2})$/)
  if (hmMatch) {
    const hours = parseInt(hmMatch[1]!, 10)
    const minutes = parseInt(hmMatch[2]!, 10)

    if (hours > 23 || minutes > 59) {
      throw new Error(`Invalid time "${input}" — hours must be 0-23, minutes 0-59`)
    }

    const target = new Date()
    target.setHours(hours, minutes, 0, 0)

    // If the time has already passed today, schedule for tomorrow
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1)
      logger.warn(`Scheduled time ${input} has already passed today — scheduling for tomorrow at ${target.toLocaleString()}`)
    }

    return target
  }

  throw new Error(`Cannot parse schedule "${input}" — use ISO 8601 or HH:MM format`)
}

export async function waitUntil(target: Date | undefined): Promise<void> {
  if (!target) return

  const delta = target.getTime() - Date.now()
  if (delta <= 0) {
    logger.warn('Scheduled time is in the past — running immediately')
    return
  }

  logger.info(`Scheduled to start at ${target.toLocaleString()}`)

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, target.getTime() - Date.now())
      const h = Math.floor(remaining / 3_600_000)
      const m = Math.floor((remaining % 3_600_000) / 60_000)
      const s = Math.floor((remaining % 60_000) / 1_000)
      const formatted = [
        h > 0 ? `${h}h` : '',
        m > 0 ? `${m}m` : '',
        `${s}s`,
      ].filter(Boolean).join(' ')
      process.stdout.write(`\r  Starting in: ${formatted}   `)

      if (remaining === 0) {
        clearInterval(interval)
        process.stdout.write('\n')
        resolve()
      }
    }, 1000)

    // Allow Ctrl+C to cancel
    const sigintHandler = () => {
      clearInterval(interval)
      process.stdout.write('\nScheduled run cancelled.\n')
      process.exit(0)
    }
    process.once('SIGINT', sigintHandler)

    setTimeout(() => {
      clearInterval(interval)
      process.stdout.write('\n')
      process.removeListener('SIGINT', sigintHandler)
      resolve()
    }, delta)
  })
}
