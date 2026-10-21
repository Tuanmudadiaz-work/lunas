import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'article'
  /** false untuk kartu daftar yang barisnya mengatur padding sendiri. */
  padded?: boolean
}

export function Card({ as: Tag = 'section', padded = true, className = '', ...rest }: CardProps) {
  return (
    <Tag
      className={`rounded-card border border-card-border bg-card ${padded ? 'p-4' : 'overflow-hidden'} ${className}`}
      {...rest}
    />
  )
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  )
}
