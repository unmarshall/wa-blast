import { writeFile } from 'node:fs/promises'
import { basename, extname, dirname, join } from 'node:path'
import type { AppState, FinalReport } from '../types/index.js'
import { logger } from '../utils/logger.js'

export async function generate(state: AppState, outputPath: string): Promise<string> {
  const report: FinalReport = {
    generatedAt: new Date().toISOString(),
    totalContacts: state.results.length,
    succeeded: [],
    failed: [],
    unconfirmed: [],
  }

  for (const r of state.results) {
    if (r.status === 'read' || r.status === 'delivered') {
      report.succeeded.push({
        name: r.name,
        phone: r.phone,
        status: r.status,
        timestamp: r.timestamp,
        deliveredAt: r.deliveredAt,
        readAt: r.readAt,
      })
    } else if (r.status === 'sent' || r.status === 'unconfirmed') {
      report.unconfirmed.push({
        name: r.name,
        phone: r.phone,
        status: r.status,
        timestamp: r.timestamp,
      })
    } else {
      // failed, pending
      report.failed.push({
        name: r.name,
        phone: r.phone,
        status: r.status,
        error: r.error,
        timestamp: r.timestamp,
      })
    }
  }

  // Write report to a separate file
  const ext = extname(outputPath)
  const base = basename(outputPath, ext)
  const dir = dirname(outputPath)
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(dir, `${base}_report_${ts}${ext}`)

  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')
  logger.info({ path: reportPath }, 'Report written')

  return reportPath
}
