'use client'

import { cn } from '@/lib/utils'

/**
 * C.F.M.C lock/shield wordmark.
 * Pure SVG so it stays crisp on every screen.
 */
export function CfmcMark({
  className,
  size = 40,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cfmc-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#7cc4ff" />
          <stop offset="55%" stopColor="#2f8bff" />
          <stop offset="100%" stopColor="#1f4fff" />
        </linearGradient>
        <filter id="cfmc-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* shield */}
      <path
        d="M24 3.5l16 5.2v11.3c0 10.4-6.7 19.4-16 23.5C14.7 39.4 8 30.4 8 20V8.7L24 3.5z"
        fill="url(#cfmc-grad)"
        fillOpacity="0.16"
        stroke="url(#cfmc-grad)"
        strokeWidth="1.6"
      />
      {/* padlock body */}
      <rect
        x="15.5"
        y="22"
        width="17"
        height="12.5"
        rx="2.6"
        fill="url(#cfmc-grad)"
        filter="url(#cfmc-glow)"
      />
      {/* shackle */}
      <path
        d="M18.5 22v-3.2a5.5 5.5 0 0 1 11 0V22"
        stroke="url(#cfmc-grad)"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      {/* keyhole */}
      <circle cx="24" cy="27.5" r="2" fill="#0a0f1f" />
      <rect x="23.1" y="28.6" width="1.8" height="4" rx="0.9" fill="#0a0f1f" />
    </svg>
  )
}

export function CfmcWordmark({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <CfmcMark size={compact ? 30 : 42} />
      <div className="leading-tight">
        <div className="font-mono text-lg font-bold tracking-[0.18em] cfmc-brand-gradient">
          C.F.M.C
        </div>
        {!compact && (
          <div className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Can&apos;t Find My Chat
          </div>
        )}
      </div>
    </div>
  )
}
