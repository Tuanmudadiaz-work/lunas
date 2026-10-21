import type { HTMLAttributes, ReactNode } from 'react'
import { Card } from './Card'

/** Satu kartu berisi beberapa baris dengan garis pemisah. */
export function ListCard({ className = '', ...rest }: HTMLAttributes<HTMLElement>) {
  return <Card as="section" padded={false} className={`divide-y divide-card-border ${className}`} {...rest} />
}

type ListRowProps = {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  trailingSub?: ReactNode
  /** Konten tambahan di bawah baris, misalnya bar progres. */
  footer?: ReactNode
  onClick?: () => void
}

export function ListRow({ leading, title, subtitle, trailing, trailingSub, footer, onClick }: ListRowProps) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{title}</div>
          {subtitle && <div className="mt-0.5">{subtitle}</div>}
        </div>
        {(trailing || trailingSub) && (
          <div className="shrink-0 text-right">
            {trailing && <div className="text-[15px] font-semibold tabular-nums">{trailing}</div>}
            {trailingSub && <div className="mt-0.5 text-[12px] text-muted">{trailingSub}</div>}
          </div>
        )}
      </div>
      {footer && <div className="mt-2.5">{footer}</div>}
    </>
  )
  const cls = 'block min-h-16 w-full px-4 py-3 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-track/40`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}
