import type { ReactNode } from 'react'

/** Satu judul per layar, di tengah, dengan slot 44px kiri dan kanan. */
export function ScreenHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="grid min-h-touch grid-cols-[44px_1fr_44px] items-center">
      <div>{left}</div>
      <h1 className="text-center text-[18px] font-semibold">{title}</h1>
      <div>{right}</div>
    </header>
  )
}
