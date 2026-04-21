import { NextResponse } from 'next/server'
import { logError } from '@/server/observability/logger'

export interface RequestContext {
  requestId: string
  ipAddress: string | null
  userAgent: string | null
  method: string
  path: string
}

export function getRequestContext(request: Request): RequestContext {
  const url = new URL(request.url)

  return {
    requestId:
      request.headers.get('x-request-id') ??
      request.headers.get('x-vercel-id') ??
      crypto.randomUUID(),
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    userAgent: request.headers.get('user-agent'),
    method: request.method,
    path: url.pathname,
  }
}

export function errorResponse(
  request: Request,
  options: {
    status: number
    message: string
    code?: string
    event: string
    error?: unknown
    extras?: Record<string, unknown>
  }
) {
  const context = getRequestContext(request)

  logError(options.event, {
    request_id: context.requestId,
    path: context.path,
    method: context.method,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    status: options.status,
    code: options.code ?? null,
    ...options.extras,
    error: options.error,
  })

  return NextResponse.json(
    {
      error: options.message,
      code: options.code,
      request_id: context.requestId,
    },
    { status: options.status }
  )
}
