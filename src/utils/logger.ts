import pino from 'pino'
import pretty from 'pino-pretty'

const stream = pretty({
  colorize: true,
  translateTime: 'HH:MM:ss',
  ignore: 'pid,hostname',
})

export const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' }, stream)
