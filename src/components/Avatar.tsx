import { loanColor } from './loanColor'

type AvatarProps = {
  /** Nama atau alias pinjaman; huruf pertamanya yang ditampilkan. */
  name: string
  /** Urutan pinjaman (0 = A). Menentukan warna. */
  colorIndex: number
  size?: number
}

export function Avatar({ name, colorIndex, size = 44 }: AvatarProps) {
  const { bg, fg } = loanColor(colorIndex)
  const letter = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.42) }}
    >
      {letter}
    </span>
  )
}
