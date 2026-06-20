'use client'

import { useState } from 'react'
import {
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CfmcWordmark } from '@/components/chat/brand'

type Mode = 'create' | 'join'

export function JoinScreen({
  onJoin,
  onCreate,
  identityReady,
}: {
  onJoin: (username: string, roomCode: string) => void
  onCreate: (username: string) => void
  identityReady: boolean
}) {
  const [mode, setMode] = useState<Mode>('create')
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')

  const canSubmit =
    identityReady &&
    username.trim().length >= 2 &&
    (mode === 'create' || roomCode.trim().length >= 3)

  const handleSubmit = () => {
    if (!canSubmit) return
    if (mode === 'create') onCreate(username.trim())
    else onJoin(username.trim(), roomCode.trim())
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <CfmcWordmark />
        <p className="max-w-xs text-sm text-muted-foreground">
          Secure, end-to-end encrypted chat. Your keys never leave your
          browser. Anyone, anywhere, can connect.
        </p>
      </div>

      <Card className="cfmc-glow border-primary/30">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-primary" />
            Enter Secure Chat
          </CardTitle>
          <CardDescription>
            Create a brand-new encrypted room, or join one with a shared code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* mode toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'create'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Create
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'join'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              Join
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Display name
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
              placeholder="e.g. nightowl"
              maxLength={32}
              autoComplete="off"
              disabled={!identityReady}
            />
          </div>

          {mode === 'join' && (
            <div className="space-y-2">
              <Label htmlFor="roomcode" className="flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-primary" />
                Room code
              </Label>
              <Input
                id="roomcode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                placeholder="BLUE-NOVA-1234"
                className="font-mono tracking-wider"
                autoComplete="off"
                disabled={!identityReady}
              />
              <p className="text-xs text-muted-foreground">
                Get this code from whoever created the room.
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {!identityReady ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating keys…
              </>
            ) : (
              <>
                {mode === 'create' ? 'Create Secure Room' : 'Join Room'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" /> ECDH P-256
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-primary" /> AES-GCM 256
            </span>
            <span className="flex items-center gap-1">
              <KeyRound className="h-3 w-3 text-primary" /> Keys stay on device
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        C.F.M.C encrypts every message in your browser before it touches the
        network. The relay server only ever sees ciphertext — it cannot read
        your conversations.
      </p>
    </div>
  )
}
