/**
 * C.F.M.C — Can't Find My Chat
 * Next.js instrumentation hook.
 *
 * `register()` runs ONCE when the Next.js server boots (dev and prod). We
 * start the zero-knowledge socket.io relay here so it lives inside the
 * long-lived Next.js process. The sandbox kills any process spawned
 * directly from a shell tool call, so the relay must share the Next.js
 * server's lifetime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRelay } = await import('@/lib/relay')
    startRelay()
  }
}
