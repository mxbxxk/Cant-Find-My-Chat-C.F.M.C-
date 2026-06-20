/**
 * C.F.M.C — Can't Find My Chat
 * Relay bootstrap endpoint.
 *
 * The relay (socket.io, port 3003) must live inside the long-lived Next.js
 * dev server process, because the sandbox kills any process spawned
 * directly from a shell tool call. This route handler runs in the Next.js
 * Node.js runtime and starts the relay (idempotently) on first hit.
 *
 * The frontend pings this endpoint before connecting the socket, so the
 * relay is guaranteed up regardless of how the dev server was booted.
 *
 * Force Node runtime — socket.io needs the Node http stack, not Edge.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { startRelay, getRelay } from '@/lib/relay'

export async function GET() {
  try {
    startRelay()
    const io = getRelay()
    return Response.json({
      ok: true,
      service: 'C.F.M.C relay',
      port: 3003,
      running: !!io,
    })
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}
