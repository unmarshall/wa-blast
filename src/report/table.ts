import Table from 'cli-table3'
import type { AppState } from '../types/index.js'

export function printSummary(state: AppState): void {
  const counts: Record<string, number> = {
    read: 0,
    delivered: 0,
    sent: 0,
    unconfirmed: 0,
    failed: 0,
    pending: 0,
  }

  for (const r of state.results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  }

  const total = state.results.length

  const table = new Table({
    head: ['Status', 'Count', '% of Total'],
    colAligns: ['left', 'right', 'right'],
    style: { head: ['cyan'] },
  })

  const order: Array<keyof typeof counts> = ['read', 'delivered', 'sent', 'unconfirmed', 'failed', 'pending']
  for (const status of order) {
    const count = counts[status] ?? 0
    if (count === 0) continue
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%'
    table.push([status, String(count), pct])
  }

  table.push([{ content: 'Total', colSpan: 1 }, String(total), '100.0%'])

  console.log('\n=== Message Delivery Summary ===')
  console.log(table.toString())
}
