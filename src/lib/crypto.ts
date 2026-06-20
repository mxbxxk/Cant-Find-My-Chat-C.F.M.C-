/**
 * C.F.M.C — Can't Find My Chat
 * End-to-End Encryption Core (Web Crypto API)
 *
 * Security model:
 *  - Each client generates an ECDH P-256 keypair locally in the browser.
 *  - The PRIVATE key never leaves the device. It is persisted in localStorage
 *    so identity is stable across reconnects (can be wiped any time).
 *  - The PUBLIC key (JWK) is shared with peers via the relay server.
 *  - For every peer, a shared AES-GCM 256-bit key is derived via ECDH.
 *    (deriveKey with ECDH is symmetric: A.derive(B.pub) === B.derive(A.pub))
 *  - Outgoing messages are encrypted ONCE PER RECIPIENT with a fresh random
 *    96-bit IV. The relay server only ever forwards ciphertext blobs.
 *  - The server is zero-knowledge: it holds no private keys and no plaintext.
 *
 * This is real public-key cryptography running natively in the browser via
 * window.crypto.subtle. It is NOT obfuscation.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }
const AES_KEY_PARAMS: AesKeyAlgorithm = { name: 'AES-GCM', length: 256 }
const IV_LENGTH = 12 // 96-bit IV for AES-GCM

const STORAGE_KEY = 'cfmc.identity.v1'

export interface PublicKeyJwk {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext: boolean
}

export interface Identity {
  /** Stable random id for this device/session */
  id: string
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicKeyJwk: PublicKeyJwk
}

export interface EncryptedPayload {
  /** base64 IV */
  iv: string
  /** base64 ciphertext+tag */
  data: string
}

// ---------- base64 helpers ----------

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function base64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function strToBuf(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bufToStr(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return new TextDecoder().decode(bytes)
}

// ---------- random ----------

export function randomId(len = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** A human-friendly room code, e.g. "BLUE-FALCON-7741" */
export function generateRoomCode(): string {
  const words = [
    'BLUE', 'NOVA', 'SHADOW', 'CIPHER', 'PIXEL', 'NEON', 'ORBIT', 'VECTOR',
    'PHANTOM', 'ECHO', 'TITAN', 'RAVEN', 'ATLAS', 'COMET', 'PRISM', 'VOID',
    'STEEL', 'FROST', 'EMBER', 'PULSE',
  ]
  const a = words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]
  const b = words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]
  const n = crypto.getRandomValues(new Uint16Array(1))[0] % 10000
  return `${a}-${b}-${n.toString().padStart(4, '0')}`
}

// ---------- key management ----------

async function exportPublicJwk(key: CryptoKey): Promise<PublicKeyJwk> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return {
    kty: jwk.kty as 'EC',
    crv: jwk.crv as 'P-256',
    x: jwk.x as string,
    y: jwk.y as string,
    ext: true,
  }
}

async function importPublicJwk(jwk: PublicKeyJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { ...jwk, key_ops: [] },
    ECDH_PARAMS,
    true,
    [],
  )
}

async function importPrivateJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, ['deriveKey'])
}

/**
 * Load or create the local identity. The private key is persisted (JWK) in
 * localStorage so reconnects keep the same identity and verified fingerprints.
 */
export async function loadIdentity(): Promise<Identity> {
  if (typeof window === 'undefined') {
    throw new Error('crypto requires a browser environment')
  }

  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      const privateKey = await importPrivateJwk(parsed.privateJwk)
      const publicKey = await importPublicJwk(parsed.publicJwk)
      const publicKeyJwk: PublicKeyJwk = parsed.publicJwk
      return { id: parsed.id, privateKey, publicKey, publicKeyJwk }
    } catch {
      // corrupted -> regenerate
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const pair = await crypto.subtle.generateKey(ECDH_PARAMS, true, [
    'deriveKey',
    'deriveBits',
  ])
  const publicJwk = await exportPublicJwk(pair.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

  const identity: Identity = {
    id: randomId(12),
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicKeyJwk: publicJwk,
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: identity.id, privateJwk, publicJwk }),
  )
  return identity
}

/** Permanently wipe the local identity + keys. */
export function wipeIdentity(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Derive a shared AES-GCM key from our private key + their public key.
 * Both directions produce the identical key (ECDH property).
 */
export async function deriveSharedKey(
  myPrivate: CryptoKey,
  theirPublicJwk: PublicKeyJwk,
): Promise<CryptoKey> {
  const theirPublic = await importPublicJwk(theirPublicJwk)
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublic },
    myPrivate,
    AES_KEY_PARAMS,
    false, // not extractable — key material cannot leave the runtime
    ['encrypt', 'decrypt'],
  )
}

// ---------- encrypt / decrypt ----------

export async function encryptForRecipient(
  sharedKey: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    strToBuf(plaintext),
  )
  return { iv: bufToBase64(iv), data: bufToBase64(ciphertext) }
}

export async function decryptForSelf(
  sharedKey: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const iv = base64ToBuf(payload.iv)
  const data = base64ToBuf(payload.data)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    data,
  )
  return bufToStr(plain)
}

/**
 * Encrypt one plaintext for MANY recipients. Returns a map of
 * recipientId -> EncryptedPayload. Each recipient gets their own copy
 * encrypted under their own shared key with a fresh IV.
 */
export async function encryptForMany(
  recipients: Map<string, CryptoKey>,
  plaintext: string,
): Promise<Record<string, EncryptedPayload>> {
  const out: Record<string, EncryptedPayload> = {}
  for (const [recipientId, key] of recipients) {
    out[recipientId] = await encryptForRecipient(key, plaintext)
  }
  return out
}

// ---------- fingerprint (for verification) ----------

/** A short, human-verifiable fingerprint of a public key. */
export async function fingerprintPublic(jwk: PublicKeyJwk): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ x: jwk.x, y: jwk.y }))
  const digest = await crypto.subtle.digest('SHA-256', raw)
  const bytes = new Uint8Array(digest).slice(0, 8)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase()
}
