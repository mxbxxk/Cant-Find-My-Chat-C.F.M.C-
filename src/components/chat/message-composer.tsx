'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  // auto-grow
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [text])

  const send = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
    requestAnimationFrame(() => ref.current?.focus())
  }

  return (
    <div className="border-t border-border/60 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2 p-3">
        <div className="relative flex-1">
          <Textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Type an encrypted message…"
            rows={1}
            disabled={disabled}
            className="min-h-[44px] resize-none pr-2"
            maxLength={4000}
          />
        </div>
        <Button
          onClick={send}
          disabled={disabled || !text.trim()}
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="Send encrypted message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-3 pb-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-primary" />
        <span>
          Encrypted end-to-end before sending · Enter to send, Shift+Enter for
          newline
        </span>
      </div>
    </div>
  )
}
