import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Allow browser requests from other local dev servers (different port) and optional
 * extra origins via CORS_ORIGINS (comma-separated, e.g. https://app.example.com).
 */
function allowOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null

  const local =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin) ||
    /^https?:\/\/\[::1\](:\d+)?$/i.test(origin)

  if (local) return origin

  const extra =
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  if (extra.includes(origin)) return origin

  return null
}

function corsHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  const origin = allowOrigin(request)
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Vary', 'Origin')
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

export function proxy(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
  }

  const response = NextResponse.next()
  const h = corsHeaders(request)
  h.forEach((value, key) => {
    response.headers.set(key, value)
  })
  return response
}

export const config = {
  matcher: ['/api/crud/:path*'],
}
