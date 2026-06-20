'use client'

import { useState } from 'react'
import {
  Check,
  Copy,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CfmcMark } from '@/components/chat/brand'
import { MessageList } from '@/components/chat/message-list'
import { MessageComposer } from '@/components/chat/message-composer'
import { MemberList } from '@/components/chat/member-list'
import type { SecureChat } from '@/hooks/use-secure-chat'

export function ChatRoom({ chat }: { chat: SecureChat }) {
  const [copied, setCopied] = useState(false)
  const roomId = chat.roomId ?? ''

  const copyRoom = async () => {
    if (!roomId) return
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const memberCount = chat.members.length
  const myId =
    chat.members.find((m) => m.isSelf)?.id ?? chat.identity?.id ?? ''

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-border/60 bg-card/50 px-3 py-2.5 backdrop-blur sm:px-4">
        <CfmcMark size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-foreground">
              C.F.M.C
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
              Can&apos;t Find My Chat
            </span>
          </div>
          <button
            onClick={copyRoom}
            className="group flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
            title="Copy room code to share"
          >
            <span className="font-mono tracking-wider">{roomId}</span>
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        </div>

        <Badge
          variant="secondary"
          className="hidden items-center gap-1.5 border-primary/30 bg-primary/10 text-primary sm:flex"
        >
          <span className="cfmc-live-dot h-1.5 w-1.5 rounded-full bg-primary" />
          ENCRYPTED
        </Badge>

        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <Users className="h-3.5 w-3.5" />
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </div>

        {/* mobile members drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Show members"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Members
              </SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100%-60px)]">
              <MemberList members={chat.members} myId={myId} />
            </div>
          </SheetContent>
        </Sheet>

        <Button
          variant="outline"
          size="sm"
          onClick={chat.leaveRoom}
          className="shrink-0"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </header>

      {/* body: messages + desktop sidebar */}
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MessageList
              messages={chat.messages}
              myId={myId}
              memberCount={Math.max(0, memberCount - 1)}
            />
          </div>
          <MessageComposer onSend={chat.sendMessage} />
        </main>

        {/* desktop member sidebar */}
        <aside className="hidden w-72 shrink-0 border-l border-border/60 bg-card/30 md:block">
          <MemberList members={chat.members} myId={myId} />
        </aside>
      </div>
    </div>
  )
}
