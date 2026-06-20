/**
 * C.F.M.C — Can't Find My Chat
 * Wire protocol types shared between the client and the zero-knowledge relay.
 *
 * IMPORTANT: The relay server only ever sees public keys + ciphertext.
 * It has no private keys and no plaintext.
 */

export interface RoomMember {
  id: string
  username: string
  publicKeyJwk: import('./crypto').PublicKeyJwk
}

/** client -> server: join (or create) a room */
export interface JoinRoomPayload {
  roomId: string
  username: string
  publicKeyJwk: import('./crypto').PublicKeyJwk
}

/** server -> client: you joined, here is the current roster */
export interface RoomJoinedPayload {
  roomId: string
  memberId: string
  members: RoomMember[]
}

/** server -> client: a new member joined (broadcast to existing members) */
export interface MemberJoinedPayload {
  member: RoomMember
}

/** server -> client: a member left */
export interface MemberLeftPayload {
  memberId: string
  username: string
}

/** client -> server: an encrypted message addressed to specific recipients */
export interface EncryptedMessageOut {
  roomId: string
  /** recipientId -> { iv, data } (ciphertext). Server forwards verbatim. */
  payloads: Record<string, import('./crypto').EncryptedPayload>
}

/** server -> client: an encrypted message relayed from another member */
export interface EncryptedMessageIn {
  from: { id: string; username: string }
  payloads: Record<string, import('./crypto').EncryptedPayload>
  timestamp: number
  /** server-assigned message id */
  id: string
}

export interface ChatErrorPayload {
  message: string
}

export const CHAT_EVENTS = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ENCRYPTED_MESSAGE: 'encrypted-message',
  ROOM_JOINED: 'room-joined',
  MEMBER_JOINED: 'member-joined',
  MEMBER_LEFT: 'member-left',
  ERROR: 'cfmc-error',
} as const
