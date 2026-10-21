import type { ReactNode } from 'react'
import { loanColor } from './loanColor'

export type DonutSegment = {
  label: string
  value: number
  /** Urutan warna pinjaman (0 = A). */
  colorIndex: number
}

type SemiDonutProps = {
  segments: DonutSegment[]
  /** Teks kecil di atas angka tengah, misalnya "Sisa utang". */
  caption: string
  /** Angka tengah yang sudah diformat oleh pemanggil. */
  total: ReactNode
  /** Ringkasan untuk pembaca layar. */
  ariaLabel: string
}

const W = 240
const CX = W / 2
const R = 96
const STROKE = 20
const CY = R + STROKE / 2 + 2
const H = CY + 4
const GAP = 0.06 // radian di antara segmen

const pt = (a: number) => `${(CX + R * Math.cos(a)).toFixed(2)} ${(CY - R * Math.sin(a)).toFixed(2)}`
const arc = (from: number, to: number) => `M ${pt(from)} A ${R} ${R} 0 0 1 ${pt(to)}`

/**
 * Grafik setengah lingkaran: satu busur per pinjaman, panjangnya sebanding dengan nilainya.
 * Komponen hanya menggambar proporsi; angka yang ditampilkan datang dari pemanggil.
 */
export function SemiDonut({ segments, caption, total, ariaLabel }: SemiDonutProps) {
  const items = segments.filter((s) => s.value > 0)
  const sum = items.reduce((acc, s) => acc + s.value, 0)
  const capAngle = STROKE / 2 / R // ujung bulat memanjang setengah tebal garis
  const usable = Math.PI - GAP * Math.max(0, items.length - 1)

  const spans = items.map((s) => (s.value / sum) * usable)
  const arcs = items.map((s, i) => {
    const start = Math.PI - spans.slice(0, i).reduce((a, b) => a + b, 0) - i * GAP
    const end = start - spans[i]
    // Ujung bulat tidak boleh keluar dari setengah lingkaran atau menabrak segmen sebelah.
    const a = start - capAngle
    const b = end + capAngle
    return { s, d: a > b ? arc(a, b) : null, dot: a <= b ? (start + end) / 2 : null }
  })

  return (
    <figure role="img" aria-label={ariaLabel} className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden>
        <path d={arc(Math.PI - capAngle, capAngle)} stroke="var(--track)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        {arcs.map(({ s, d, dot }) => {
          const { bg } = loanColor(s.colorIndex)
          return d ? (
            <path key={s.label} d={d} stroke={bg} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          ) : (
            <circle
              key={s.label}
              cx={CX + R * Math.cos(dot!)}
              cy={CY - R * Math.sin(dot!)}
              r={STROKE / 2}
              fill={bg}
            />
          )
        })}
      </svg>
      <figcaption className="absolute inset-x-0 bottom-1 text-center">
        <div className="text-[12px] text-muted">{caption}</div>
        <div className="text-[24px] font-bold leading-tight tabular-nums">{total}</div>
      </figcaption>
    </figure>
  )
}

export function DonutLegend({ segments, format }: { segments: DonutSegment[]; format: (n: number) => string }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-[13px]">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: loanColor(s.colorIndex).bg }} />
          <span className="truncate text-muted">{s.label}</span>
          <span className="ml-auto font-medium tabular-nums">{format(s.value)}</span>
        </li>
      ))}
    </ul>
  )
}
