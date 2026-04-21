import { randomInt } from 'node:crypto'

export function randomDelay(min: number, max: number): Promise<void> {
  const ms = randomInt(min, max + 1)
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function longPause(min: number, max: number): Promise<void> {
  const ms = randomInt(min, max + 1)
  const seconds = (ms / 1000).toFixed(1)
  process.stdout.write(`\n[batch pause] Waiting ${seconds}s before next batch...\n`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
