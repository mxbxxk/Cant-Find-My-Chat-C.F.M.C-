'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import type { ChatMessage } from '@/hooks/use-secure-chat'

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function initials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  return t.slice(0, 2).toUpperCase()
}

function hashHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function MessageList({
  messages,
  myId,
  memberCount,
}: {
  messages: ChatMessage[]
  myId: string
  memberCount: number
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Say hello — your first message will be encrypted for{' '}
            {memberCount === 0
              ? 'yourself'
              : `${memberCount} ${memberCount === 1 ? 'peer' : 'peers'}`}
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cfmc-scroll h-full overflow-y-auto px-3 py-4 sm:px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {messages.map((m) => {
          if (m.kind === 'system') {
            return (
              <div
                key={m.id}
                className="mx-auto cfmc-bubble-system rounded-full px-3 py-1 text-center text-xs"
              >
                {m.text}
              </div>
            )
          }
          const isSelf = m.fromId === myId
          return (
            <div
              key={m.id}
              className={cn(
                'flex items-end gap-2',
                isSelf ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-bold',
                  isSelf
                    ? 'bg-primary/20 text-primary'
                    : 'border border-border bg-secondary text-foreground',
                )}
                style={
                  isSelf
                    ? undefined
                    : {
                        color: `hsl(${hashHue(m.fromName)} 80% 70%)`,
                        borderColor: `hsl(${hashHue(m.fromName)} 70% 50% / 0.4)`,
                      }
                }
                aria-hidden
              >
                {initials(m.fromName)}
              </div>
              <div
                className={cn(
                  'flex max-w-[78%] flex-col gap-0.5',
                  isSelf ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground',
                    isSelf ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  <span className="font-medium text-foreground/80">
                    {isSelf ? 'You' : m.fromName}
                  </span>
                  <Lock className="h-2.5 w-2.5 text-primary/70" />
                  <span>{formatTime(m.timestamp)}</span>
                </div>
                <div
                  className={cn(
                    'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    isSelf
                      ? 'cfmc-bubble-self rounded-br-md'
                      : 'cfmc-bubble-peer rounded-bl-md',
                  )}
                >
                  {m.text}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}
