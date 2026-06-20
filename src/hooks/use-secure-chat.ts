'use client'

/**
 * useSecureChat — the heart of C.F.M.C.
 *
 * Responsibilities:
 *  - Load (or create) the local ECDH identity.
 *  - Connect to the zero-knowledge relay (socket.io, port 3003 via gateway).
 *  - Maintain the room roster + per-peer shared AES-GCM keys.
 *  - Encrypt outgoing messages once per recipient, decrypt incoming messages
 *    addressed to us.
 *
 * The relay NEVER receives plaintext or private keys.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  CHAT_EVENTS,
  type ChatErrorPayload,
  type EncryptedMessageIn,
  type EncryptedMessageOut,
  type JoinRoomPayload,
  type MemberJoinedPayload,
  type MemberLeftPayload,
  type RoomJoinedPayload,
  type RoomMember,
} from '@/lib/chat-protocol'
import {
  type EncryptedPayload,
  type Identity,
  deriveSharedKey,
  encryptForMany,
  fingerprintPublic,
  loadIdentity,
  decryptForSelf,
  generateRoomCode,
} from '@/lib/crypto'

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'joining'
  | 'in-room'
  | 'error'

/** Return shape of the useSecureChat hook, for downstream components. */
export type SecureChat = ReturnType<typeof useSecureChat>

export interface ChatMessage {
  id: string
  /** our own id, for aligning bubbles */
  ownerId: string
  fromId: string
  fromName: string
  text: string
  timestamp: number
  kind: 'message' | 'system'
}

export interface MemberView {
  id: string
  username: string
  fingerprint: string
  isSelf: boolean
  keyReady: boolean
}

// The relay (socket.io) listens on this port inside the Next.js process.
const RELAY_PORT = 3003

/**
 * Decide how the socket should connect, based on how the page was opened:
 *
 *  - LOCAL access (localhost / 127.0.0.1, e.g. running on your own Windows
 *    PC and opening http://localhost:3000): connect DIRECTLY to the relay
 *    port on the same machine. No gateway needed.
 *
 *  - REMOTE access (a public domain, an ngrok URL, a public IP, a LAN IP
 *    from another device): route through the Caddy gateway using the
 *    XTransformPort query param. This requires Caddy to be running with
 *    the project Caddyfile (it proxies ?XTransformPort=3003 -> :3003).
 */
function buildSocketConfig() {
  if (typeof window === 'undefined') {
    // SSR fallback — won't actually connect here.
    return {
      url: '/',
      opts: {
        path: '/',
        query: { XTransformPort: String(RELAY_PORT) },
        transports: ['polling', 'websocket'] as const,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 800,
        timeout: 10000,
      },
    }
  }

  const localHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
  const isLocalAccess = localHosts.includes(window.location.hostname)

  const commonOpts = {
    path: '/',
    transports: ['polling', 'websocket'] as const,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    timeout: 10000,
  }

  if (isLocalAccess) {
    // Direct connection to the relay on the same machine.
    return {
      url: `${window.location.protocol}//${window.location.hostname}:${RELAY_PORT}`,
      opts: commonOpts,
    }
  }
  // Remote — go through the Caddy gateway.
  return {
    url: '/',
    opts: { ...commonOpts, query: { XTransformPort: String(RELAY_PORT) } },
  }
}

export function useSecureChat() {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<MemberView[]>([])
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [username, setUsername] = useState<string>('')

  const socketRef = useRef<Socket | null>(null)
  const identityRef = useRef<Identity | null>(null)
  // peerId -> shared CryptoKey
  const sharedKeysRef = useRef<Map<string, CryptoKey>>(new Map())
  // peerId -> RoomMember (for public keys, incl. self)
  const rosterRef = useRef<Map<string, RoomMember>>(new Map())
  const myMemberIdRef = useRef<string>('')

  // ---- load identity on mount ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const id = await loadIdentity()
        if (cancelled) return
        identityRef.current = id
        setIdentity(id)
      } catch (e) {
        setError(
          'Could not initialise cryptographic identity: ' +
            (e instanceof Error ? e.message : String(e)),
        )
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- connect socket ----
  useEffect(() => {
    if (!identity) return
    let cancelled = false
    let socket: Socket | null = null

    const boot = async () => {
      setStatus('connecting')
      // 1. Ensure the relay is running inside the Next.js process
      //    (it starts lazily on first hit of /api/relay). Without this,
      //    the socket would try to connect before the relay is listening.
      try {
        const res = await fetch('/api/relay', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`relay bootstrap failed (${res.status})`)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            'Could not reach the relay: ' +
              (e instanceof Error ? e.message : String(e)),
          )
          setStatus('error')
        }
        return
      }
      if (cancelled) return

      // 2. Connect. buildSocketConfig() picks the right transport based on
      //    whether we're accessing locally (direct to relay port) or remotely
      //    (through the Caddy gateway via XTransformPort).
      const { url, opts } = buildSocketConfig()
      socket = io(url, opts)
      socketRef.current = socket

      socket.on('connect', () => {
        setStatus('connected')
        setError(null)
      })
      socket.on('disconnect', () => {
        setStatus('connected')
      })
      socket.on('connect_error', (err: Error) => {
        setError('Connection error: ' + err.message)
      })

      socket.on(CHAT_EVENTS.ROOM_JOINED, (payload: RoomJoinedPayload) => {
        myMemberIdRef.current = payload.memberId
        setRoomId(payload.roomId)
        // store roster, derive keys for everyone
        ;(async () => {
          const me = identityRef.current
          if (!me) return
          rosterRef.current = new Map()
          sharedKeysRef.current = new Map()
          // include self in roster (no shared key needed for self)
          for (const m of payload.members) {
            rosterRef.current.set(m.id, m)
            if (m.id !== payload.memberId) {
              try {
                const k = await deriveSharedKey(me.privateKey, m.publicKeyJwk)
                sharedKeysRef.current.set(m.id, k)
              } catch (e) {
                console.error('derive failed for', m.id, e)
              }
            }
          }
          syncMembersView(payload.memberId)
          setStatus('in-room')
          pushSystem(
            'Secure channel established. Messages are end-to-end encrypted.',
          )
        })()
      })

      socket.on(CHAT_EVENTS.MEMBER_JOINED, (payload: MemberJoinedPayload) => {
        const me = identityRef.current
        const m = payload.member
        if (!me) return
        rosterRef.current.set(m.id, m)
        ;(async () => {
          try {
            const k = await deriveSharedKey(me.privateKey, m.publicKeyJwk)
            sharedKeysRef.current.set(m.id, k)
            syncMembersView(myMemberIdRef.current)
            pushSystem(`${m.username} joined — encrypted channel ready.`)
          } catch (e) {
            console.error('derive failed on join', e)
          }
        })()
      })

      socket.on(CHAT_EVENTS.MEMBER_LEFT, (payload: MemberLeftPayload) => {
        rosterRef.current.delete(payload.memberId)
        sharedKeysRef.current.delete(payload.memberId)
        syncMembersView(myMemberIdRef.current)
        pushSystem(`${payload.username} left the room.`)
      })

      socket.on(
        CHAT_EVENTS.ENCRYPTED_MESSAGE,
        async (payload: EncryptedMessageIn) => {
          const me = identityRef.current
          if (!me) return
          const myId = myMemberIdRef.current
          const box = payload.payloads[myId]
          if (!box) return // not addressed to us
          const key = sharedKeysRef.current.get(payload.from.id)
          if (!key) {
            // peer key not ready yet; skip
            return
          }
          try {
            const text = await decryptForSelf(key, box)
            setMessages((prev) => [
              ...prev,
              {
                id: payload.id,
                ownerId: payload.from.id,
                fromId: payload.from.id,
                fromName: payload.from.username,
                text,
                timestamp: payload.timestamp,
                kind: 'message',
              },
            ])
          } catch (e) {
            console.error('decrypt failed', e)
          }
        },
      )

      socket.on(CHAT_EVENTS.ERROR, (payload: ChatErrorPayload) => {
        setError(payload.message)
      })
    }

    boot()

    return () => {
      cancelled = true
      if (socket) {
        socket.disconnect()
      }
      socketRef.current = null
    }
  }, [identity])

  const syncMembersView = useCallback((myId: string) => {
    const me = identityRef.current
    const views: MemberView[] = []
    rosterRef.current.forEach((m) => {
      views.push({
        id: m.id,
        username: m.username,
        fingerprint: '…',
        isSelf: m.id === myId,
        keyReady: m.id === myId || sharedKeysRef.current.has(m.id),
      })
    })
    // compute fingerprints async
    ;(async () => {
      const withFp: MemberView[] = []
      for (const m of rosterRef.current.values()) {
        const fp = await fingerprintPublic(m.publicKeyJwk).catch(() => '????')
        withFp.push({
          id: m.id,
          username: m.username,
          fingerprint: fp,
          isSelf: m.id === myId,
          keyReady: m.id === myId || sharedKeysRef.current.has(m.id),
        })
      }
      setMembers(withFp)
    })()
    setMembers(views)
  }, [])

  const pushSystem = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ownerId: 'system',
        fromId: 'system',
        fromName: 'SYSTEM',
        text,
        timestamp: Date.now(),
        kind: 'system',
      },
    ])
  }, [])

  const joinRoom = useCallback(
    (name: string, room: string) => {
      const socket = socketRef.current
      const id = identityRef.current
      if (!socket || !id) return
      setUsername(name)
      setStatus('joining')
      const payload: JoinRoomPayload = {
        roomId: room.trim().toUpperCase(),
        username: name.trim(),
        publicKeyJwk: id.publicKeyJwk,
      }
      socket.emit(CHAT_EVENTS.JOIN_ROOM, payload)
    },
    [],
  )

  const createRoom = useCallback(
    (name: string) => {
      joinRoom(name, generateRoomCode())
    },
    [joinRoom],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const socket = socketRef.current
      const id = identityRef.current
      if (!socket || !id || !roomId) return
      const trimmed = text.trim()
      if (!trimmed) return

      // build recipient map (everyone except self)
      const recipients = new Map<string, CryptoKey>()
      sharedKeysRef.current.forEach((key, peerId) => {
        recipients.set(peerId, key)
      })

      // If we're alone in the room, still echo locally as an encrypted note.
      let payloads: Record<string, EncryptedPayload> = {}
      if (recipients.size > 0) {
        payloads = await encryptForMany(recipients, trimmed)
      }

      const out: EncryptedMessageOut = { roomId, payloads }
      socket.emit(CHAT_EVENTS.ENCRYPTED_MESSAGE, out)

      // show our own message locally (it was encrypted for others, plaintext here)
      setMessages((prev) => [
        ...prev,
        {
          id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ownerId: myMemberIdRef.current,
          fromId: myMemberIdRef.current,
          fromName: username || 'You',
          text: trimmed,
          timestamp: Date.now(),
          kind: 'message',
        },
      ])
    },
    [roomId, username],
  )

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current
    if (socket && roomId) {
      socket.emit(CHAT_EVENTS.LEAVE_ROOM, { roomId })
    }
    rosterRef.current.clear()
    sharedKeysRef.current.clear()
    setMembers([])
    setMessages([])
    setRoomId(null)
    setStatus('connected')
  }, [roomId])

  return {
    status,
    error,
    messages,
    members,
    identity,
    roomId,
    username,
    joinRoom,
    createRoom,
    sendMessage,
    leaveRoom,
  }
}
