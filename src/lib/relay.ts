/**
 * C.F.M.C — Can't Find My Chat
 * Zero-Knowledge Relay (in-process)
 *
 * This is the SAME relay logic as the standalone mini-service, but it is
 * started from Next.js's instrumentation hook so it lives inside the
 * long-lived Next.js dev server process. (The sandbox kills any process
 * spawned directly from a shell tool call, so a standalone mini-service
 * cannot survive. Piggy-backing on the Next.js server is the robust fix.)
 *
 * The relay still does ZERO knowledge of message contents:
 *   - holds NO private keys
 *   - receives only public keys + ciphertext
 *   - never decrypts, never inspects payload bytes
 *
 * Port 3003, socket.io, path "/" (required by the Caddy gateway).
 */

import { createServer, type Server as HttpServer } from 'http'
import { Server } from 'socket.io'

const RELAY_PORT = 3003

interface Member {
  id: string
  username: string
  publicKeyJwk: {
    kty: string
    crv: string
    x: string
    y: string
    ext: boolean
  }
}

interface Room {
  members: Map<string, Member>
}

const EV = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ENCRYPTED_MESSAGE: 'encrypted-message',
  ROOM_JOINED: 'room-joined',
  MEMBER_JOINED: 'member-joined',
  MEMBER_LEFT: 'member-left',
  ERROR: 'cfmc-error',
} as const

const globalForRelay = globalThis as unknown as {
  __cfmcRelayStarted?: boolean
  __cfmcRelayIo?: Server
}

function publicMember(m: Member) {
  return { id: m.id, username: m.username, publicKeyJwk: m.publicKeyJwk }
}

/**
 * Start the zero-knowledge relay once. Safe to call multiple times — it
 * guards against double-start (which can happen during dev HMR).
 */
export function startRelay(): void {
  if (globalForRelay.__cfmcRelayStarted) {
    // Already running in this process.
    return
  }
  globalForRelay.__cfmcRelayStarted = true

  const rooms = new Map<string, Room>()
  const getOrCreateRoom = (roomId: string): Room => {
    let r = rooms.get(roomId)
    if (!r) {
      r = { members: new Map() }
      rooms.set(roomId, r)
    }
    return r
  }

  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        service: 'C.F.M.C relay',
        role: 'zero-knowledge message relay',
        uptime: process.uptime(),
      }),
    )
  })

  const io = new Server(httpServer, {
    path: '/',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  })
  globalForRelay.__cfmcRelayIo = io

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null
    let currentMember: Member | null = null

    const leaveCurrentRoom = () => {
      if (!currentRoomId || !currentMember) return
      const room = rooms.get(currentRoomId)
      if (room) {
        room.members.delete(socket.id)
        socket.to(currentRoomId).emit(EV.MEMBER_LEFT, {
          memberId: socket.id,
          username: currentMember.username,
        })
        if (room.members.size === 0) rooms.delete(currentRoomId)
      }
      socket.leave(currentRoomId)
      currentRoomId = null
      currentMember = null
    }

    socket.on(EV.JOIN_ROOM, (data: unknown) => {
      try {
        const d = data as Record<string, unknown>
        const roomId = String(d?.roomId ?? '').trim().toUpperCase()
        const username = String(d?.username ?? '').trim().slice(0, 32)
        const publicKeyJwk = d?.publicKeyJwk as
          | Member['publicKeyJwk']
          | undefined
        if (
          !roomId ||
          !username ||
          !publicKeyJwk?.x ||
          !publicKeyJwk?.y
        ) {
          socket.emit(EV.ERROR, { message: 'Invalid join payload.' })
          return
        }
        if (currentRoomId) leaveCurrentRoom()

        currentRoomId = roomId
        const room = getOrCreateRoom(roomId)
        const member: Member = { id: socket.id, username, publicKeyJwk }
        currentMember = member
        room.members.set(socket.id, member)
        socket.join(roomId)

        const roster = Array.from(room.members.values()).map(publicMember)
        socket.emit(EV.ROOM_JOINED, {
          roomId,
          memberId: socket.id,
          members: roster,
        })
        socket
          .to(roomId)
          .emit(EV.MEMBER_JOINED, { member: publicMember(member) })

        console.log(
          `[cfmc-relay] join ${username} -> ${roomId} (${room.members.size})`,
        )
      } catch (e) {
        socket.emit(EV.ERROR, { message: 'Join failed.' })
        console.error('[cfmc-relay] join error', e)
      }
    })

    socket.on(EV.ENCRYPTED_MESSAGE, (data: unknown) => {
      if (!currentRoomId || !currentMember) {
        socket.emit(EV.ERROR, { message: 'Not in a room.' })
        return
      }
      const d = data as Record<string, unknown>
      const payloads = d?.payloads
      if (!payloads || typeof payloads !== 'object') {
        socket.emit(EV.ERROR, { message: 'Malformed message.' })
        return
      }
      // Relay VERBATIM. We never look inside the ciphertext.
      const msgId = `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
      io.to(currentRoomId).emit(EV.ENCRYPTED_MESSAGE, {
        id: msgId,
        from: { id: currentMember.id, username: currentMember.username },
        payloads,
        timestamp: Date.now(),
      })
    })

    socket.on(EV.LEAVE_ROOM, () => leaveCurrentRoom())
    socket.on('disconnect', () => leaveCurrentRoom())
    socket.on('error', (err: Error) =>
      console.error(`[cfmc-relay] socket error ${socket.id}:`, err.message),
    )
  })

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(
        `[cfmc-relay] port ${RELAY_PORT} already in use — assuming another instance is serving. NOT fatal.`,
      )
    } else {
      console.error('[cfmc-relay] http error', err)
    }
  })

  httpServer.listen(RELAY_PORT, () => {
    console.log(
      `[cfmc-relay] Zero-knowledge relay listening on port ${RELAY_PORT} (inside Next.js process)`,
    )
  })
}

/** Test helper / debug accessor. */
export function getRelay(): Server | undefined {
  return globalForRelay.__cfmcRelayIo
}

export type { HttpServer }
