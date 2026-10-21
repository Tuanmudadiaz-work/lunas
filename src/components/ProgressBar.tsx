type ProgressBarProps = {
  /** 0 sampai 100. Nilainya dihitung di lapisan logika, komponen ini hanya menggambar. */
  value: number
  label: string
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-track"
    >
      <div className="h-full rounded-full bg-bar transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  )
}
