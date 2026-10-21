import { useId, type KeyboardEvent } from 'react'

type Option<T extends string> = { value: T; label: string }

type SegmentedProps<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}

export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  const name = useId()
  const onKey = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(i + step + options.length) % options.length]
    onChange(next.value)
    document.getElementById(`${name}-${next.value}`)?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className="flex rounded-full border border-card-border bg-card p-1"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            id={`${name}-${o.value}`}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`min-h-[40px] flex-auto whitespace-nowrap rounded-full px-2.5 text-[14px] font-medium transition-colors ${
              active ? 'bg-primary text-on-primary shadow-soft' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
