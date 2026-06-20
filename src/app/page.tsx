'use client'

import { AlertTriangle, Loader2, WifiOff } from 'lucide-react'
import { useSecureChat } from '@/hooks/use-secure-chat'
import { JoinScreen } from '@/components/chat/join-screen'
import { ChatRoom } from '@/components/chat/chat-room'
import { CfmcFooter } from '@/components/chat/footer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function Home() {
  const chat = useSecureChat()

  const identityReady = !!chat.identity
  const inRoom = chat.status === 'in-room' && !!chat.roomId
  const connecting =
    chat.status === 'connecting' || chat.status === 'connected'

  return (
    <div className="cfmc-backdrop flex min-h-screen flex-col">
      {/* top status strip */}
      <div className="flex items-center justify-center gap-2 border-b border-border/40 bg-background/40 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        {chat.status === 'error' ? (
          <>
            <WifiOff className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Connection error</span>
          </>
        ) : connecting || chat.status === 'in-room' ? (
          <>
            <span className="cfmc-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Relay connected · zero-knowledge</span>
          </>
        ) : (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Connecting to relay…</span>
          </>
        )}
      </div>

      {/* error banner */}
      {chat.error && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{chat.error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* main content fills remaining space, footer pinned below */}
      {inRoom ? (
        <ChatRoom chat={chat} />
      ) : (
        <main className="flex flex-1 items-center justify-center">
          <JoinScreen
            onJoin={chat.joinRoom}
            onCreate={chat.createRoom}
            identityReady={identityReady}
          />
        </main>
      )}

      <CfmcFooter />
    </div>
  )
}
