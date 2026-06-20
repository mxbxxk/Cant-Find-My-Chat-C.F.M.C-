'use client'

import { Check, Fingerprint, KeyRound, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MemberView } from '@/hooks/use-secure-chat'

export function MemberList({
  members,
  myId,
}: {
  members: MemberView[]
  myId: string
}) {
  const readyCount = members.filter((m) => m.keyReady).length
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Secure members</h3>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {readyCount} ready
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Each peer has a unique key fingerprint.
        </p>
      </div>
      <div className="cfmc-scroll flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {members.length === 0 && (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">
              No members yet.
            </li>
          )}
          {members.map((m) => (
            <li
              key={m.id}
              className={cn(
                'rounded-lg border px-3 py-2 transition',
                m.isSelf
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-transparent hover:border-border hover:bg-secondary/50',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    m.isSelf
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-foreground',
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {m.username}
                    </span>
                    {m.isSelf && (
                      <span className="rounded bg-primary/20 px-1 text-[10px] font-semibold text-primary">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {m.keyReady ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>key established</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>deriving key…</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 pl-9 font-mono text-[10px] text-muted-foreground/80">
                <Fingerprint className="h-3 w-3" />
                <span className="truncate">{m.fingerprint}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border/60 px-4 py-3">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <KeyRound className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span>
            Compare fingerprints out-of-band to verify a peer&apos;s identity.
          </span>
        </div>
      </div>
    </div>
  )
}
