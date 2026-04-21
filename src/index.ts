#!/usr/bin/env node
import { program } from './cli.js'

program.parseAsync(process.argv).catch(err => {
  console.error('Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
