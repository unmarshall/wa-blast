import { Command, InvalidArgumentError } from 'commander'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { RunConfig } from './types/index.js'
import { parseScheduleArg } from './core/scheduler.js'
import { run } from './core/pipeline.js'
import { logger } from './utils/logger.js'

function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10)
  if (isNaN(n) || n < 0) throw new InvalidArgumentError(`${name} must be a non-negative integer`)
  return n
}

const program = new Command()

program
  .name('wa-blast')
  .description('Send personalized WhatsApp messages to contacts from a CSV file')
  .version('1.0.0')
  .requiredOption('--csv <path>', 'Path to CSV file (columns: name, phone)')
  .option('--msg <text>', 'Message text (supports {name} and {phone} placeholders)')
  .option('--msg-file <path>', 'Read message from a text file')
  .option('--schedule <time>', 'Start time: ISO 8601 or HH:MM (local time)')
  .option('--output <path>', 'Output state file path', `results_${Date.now()}.json`)
  .option('--delay-min <ms>', 'Min delay between messages in ms', v => parsePositiveInt(v, '--delay-min'), 3000)
  .option('--delay-max <ms>', 'Max delay between messages in ms', v => parsePositiveInt(v, '--delay-max'), 8000)
  .option('--batch-size <n>', 'Number of messages before a long pause', v => parsePositiveInt(v, '--batch-size'), 20)
  .option('--batch-pause-min <ms>', 'Min long pause duration in ms', v => parsePositiveInt(v, '--batch-pause-min'), 30_000)
  .option('--batch-pause-max <ms>', 'Max long pause duration in ms', v => parsePositiveInt(v, '--batch-pause-max'), 60_000)
  .option('--resume', 'Resume from a previous run (uses --output file as checkpoint)', false)
  .action(async (opts: {
    csv: string
    msg?: string
    msgFile?: string
    schedule?: string
    output: string
    delayMin: number
    delayMax: number
    batchSize: number
    batchPauseMin: number
    batchPauseMax: number
    resume: boolean
  }) => {
    // Validate CSV path
    const csvPath = resolve(opts.csv)
    if (!existsSync(csvPath)) {
      logger.error(`CSV file not found: ${csvPath}`)
      process.exit(1)
    }

    // Validate message source (exactly one of --msg or --msg-file)
    if (!opts.msg && !opts.msgFile) {
      logger.error('Either --msg or --msg-file must be provided')
      process.exit(1)
    }
    if (opts.msg && opts.msgFile) {
      logger.error('--msg and --msg-file are mutually exclusive')
      process.exit(1)
    }

    let messageTemplate: string
    if (opts.msgFile) {
      const msgFilePath = resolve(opts.msgFile)
      if (!existsSync(msgFilePath)) {
        logger.error(`Message file not found: ${msgFilePath}`)
        process.exit(1)
      }
      messageTemplate = readFileSync(msgFilePath, 'utf8').trim()
    } else {
      messageTemplate = opts.msg!
    }

    if (!messageTemplate) {
      logger.error('Message cannot be empty')
      process.exit(1)
    }

    // Validate delay range
    if (opts.delayMin >= opts.delayMax) {
      logger.error('--delay-min must be less than --delay-max')
      process.exit(1)
    }
    if (opts.delayMin < 2000) {
      logger.warn('--delay-min is below 2000ms — risk of WhatsApp rate limiting or ban')
    }

    // Parse schedule
    let schedule: Date | undefined
    if (opts.schedule) {
      try {
        schedule = parseScheduleArg(opts.schedule)
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err))
        process.exit(1)
      }
    }

    // Validate resume + output file
    const outputPath = resolve(opts.output)
    if (opts.resume && !existsSync(outputPath)) {
      logger.error(`--resume specified but state file not found: ${outputPath}`)
      process.exit(1)
    }

    const config: RunConfig = {
      csv: csvPath,
      messageTemplate,
      schedule,
      outputPath,
      delayMin: opts.delayMin,
      delayMax: opts.delayMax,
      batchSize: opts.batchSize,
      batchPauseMin: opts.batchPauseMin,
      batchPauseMax: opts.batchPauseMax,
      unconfirmedTimeoutMs: 86_400_000, // 24h
      statusCollectionWindowMs: 60_000,  // 60s
      resume: opts.resume,
    }

    await run(config)
  })

export { program }
