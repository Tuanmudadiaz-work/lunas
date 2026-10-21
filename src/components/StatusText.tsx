import { AlertIcon, CheckCircleIcon } from './icons'
import type { OjkStatus } from '../domain'

export type { OjkStatus }

const LABEL: Record<OjkStatus, string> = {
  registered: 'Terdaftar OJK',
  unregistered: 'Belum terdaftar OJK',
}

/** Status legal selalu berupa teks; ikon dan warna hanya pendukung. */
export function StatusText({ status, className = '' }: { status: OjkStatus; className?: string }) {
  const ok = status === 'registered'
  const Icon = ok ? CheckCircleIcon : AlertIcon
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${ok ? 'text-ok' : 'text-warn'} ${className}`}>
      <Icon width={14} height={14} strokeWidth={2} />
      {LABEL[status]}
    </span>
  )
}

type BadgeTone = 'primary' | 'accent' | 'ok' | 'warn'

const TONE: Record<BadgeTone, string> = {
  primary: 'text-link border-current',
  accent: 'bg-accent text-on-accent border-transparent',
  ok: 'text-ok border-current',
  warn: 'text-warn border-current',
}

export function Badge({ tone = 'primary', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  )
}
