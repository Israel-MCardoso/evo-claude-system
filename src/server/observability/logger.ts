type LogLevel = 'info' | 'warn' | 'error'

interface LogPayload {
  [key: string]: unknown
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}

export function logEvent(level: LogLevel, event: string, payload: LogPayload = {}) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  }

  if (level === 'error') {
    console.error(entry)
    return
  }

  if (level === 'warn') {
    console.warn(entry)
    return
  }

  console.info(entry)
}

export function logInfo(event: string, payload?: LogPayload) {
  logEvent('info', event, payload)
}

export function logWarn(event: string, payload?: LogPayload) {
  logEvent('warn', event, payload)
}

export function logError(event: string, payload?: LogPayload & { error?: unknown }) {
  const normalizedPayload =
    payload && 'error' in payload
      ? {
          ...payload,
          error: serializeError(payload.error),
        }
      : payload

  logEvent('error', event, normalizedPayload)
}
