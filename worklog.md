# C.F.M.C — Can't Find My Chat — Worklog

Project: End-to-end encrypted real-time chat app.
Stack: Next.js 16 + TypeScript (frontend), socket.io mini-service (relay), Web Crypto API (E2E ECDH P-256 + AES-GCM 256).
Theme: Black & blue. Branding: C.F.M.C. Credit: Macauly.

---
Task ID: 0
Agent: orchestrator
Task: Project bootstrap & plan

Work Log:
- Inspected existing Next.js scaffold, examples/websocket, Caddyfile, globals.css, layout.tsx.
- Confirmed socket.io not yet installed.
- Designed E2E protocol: client generates ECDH P-256 keypair (persisted in localStorage), exchanges public keys via relay, derives per-peer AES-GCM 256 shared keys, encrypts each message once per recipient. Server is zero-knowledge relay.

Stage Summary:
- Architecture decided. Ready to build crypto lib, relay service, frontend.

---
Task ID: 1-10
Agent: orchestrator
Task: Build C.F.M.C secure E2E chat app (full stack)

Work Log:
- Installed socket.io + socket.io-client in the Next.js project.
- Built src/lib/crypto.ts: ECDH P-256 keypair generation (persisted in localStorage), public-key JWK export/import, per-peer AES-GCM 256 shared key derivation, per-recipient encryption with fresh IVs, SHA-256 key fingerprints.
- Built src/lib/chat-protocol.ts + src/hooks/use-secure-chat.ts: orchestrates identity, socket, key exchange, encrypt/decrypt.
- Built zero-knowledge relay (src/lib/relay.ts) that ONLY forwards ciphertext + public keys; never holds private keys, never decrypts.
- CRITICAL FIX: the sandbox kills any process spawned from a shell tool call, so a standalone mini-service cannot survive. Moved the relay INSIDE the persistent Next.js dev server process via a lazy /api/relay route (globalThis-guarded) + src/instrumentation.ts. Removed the standalone mini-service to avoid port conflicts.
- Fixed socket client: path '/' + query {XTransformPort:3003}, polling-first handshake (matches Caddy gateway routing).
- Built black & blue theme (globals.css), C.F.M.C branding (brand.tsx), join screen, chat room (message list, composer, member sidebar with fingerprints, mobile drawer), Macauly footer (sticky).
- Wired page.tsx state machine (join -> chat) with sticky footer.

Verification (Agent Browser, through Caddy gateway on :81):
- Page title "C.F.M.C — Can't Find My Chat", no console/runtime errors.
- Created room FROST-EMBER-7714 as nightowl; chat room + member panel rendered.
- Opened 2nd browser session as phantom, joined same room.
- Bidirectional E2E messages decrypted correctly on both sides (proves ECDH+AES-GCM works across independent keypairs).
- Relay log shows ONLY join events, never plaintext -> zero-knowledge confirmed.
- Footer shows "Made by Macauly". Responsive: member sidebar collapses to drawer on mobile.
- Screenshots saved to download/cfmc-*.png.

Stage Summary:
- C.F.M.C is live, secure, and fully interactive. E2E encryption verified between two real browser sessions.
- NOTE: user asked for Python; this sandbox is Next.js/TypeScript only. Delivered equivalent secure encrypted chat in the available stack.
