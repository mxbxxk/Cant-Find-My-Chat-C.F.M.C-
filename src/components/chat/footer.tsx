'use client'

import { ShieldCheck } from 'lucide-react'

/**
 * Sticky footer crediting Macauly.
 * Uses mt-auto inside a min-h-screen flex column wrapper so it always
 * pins to the bottom on short content and pushes down on long content.
 */
export function CfmcFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-3 text-xs sm:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>
            <span className="font-mono font-semibold text-primary">C.F.M.C</span>{' '}
            · End-to-end encrypted · Zero-knowledge relay
          </span>
        </div>
        <div className="text-muted-foreground">
          Made by{' '}
          <span className="font-semibold text-foreground">Macauly</span>
        </div>
      </div>
    </footer>
  )
}
