import type { ComponentType, SVGProps } from 'react'
import { CalendarIcon, HomeIcon, LeafIcon, ListIcon, PlusIcon } from './icons'

export type TabKey = 'beranda' | 'utang' | 'kalender' | 'tenang'

const TABS: { key: TabKey; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: 'beranda', label: 'Beranda', Icon: HomeIcon },
  { key: 'utang', label: 'Utang', Icon: ListIcon },
  { key: 'kalender', label: 'Kalender', Icon: CalendarIcon },
  { key: 'tenang', label: 'Tenang', Icon: LeafIcon },
]

type PillNavProps = {
  active: TabKey
  onChange: (tab: TabKey) => void
  onAdd: () => void
  /** true: menempel di bawah layar. false: mengalir di halaman (untuk contoh). */
  fixed?: boolean
}

/** Menu bawah: empat tab dengan tombol + di tengah. */
export function PillNav({ active, onChange, onAdd, fixed = true }: PillNavProps) {
  const tab = ({ key, label, Icon }: (typeof TABS)[number]) => {
    const on = key === active
    return (
      <button
        key={key}
        type="button"
        aria-current={on ? 'page' : undefined}
        onClick={() => onChange(key)}
        className={`flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 transition-colors ${
          on ? 'bg-nav-active text-on-nav-active' : 'text-muted'
        }`}
      >
        <Icon width={20} height={20} />
        <span className="text-[11px] font-medium leading-none">{label}</span>
      </button>
    )
  }
  return (
    <nav
      aria-label="Menu utama"
      className={`${fixed ? 'fixed inset-x-0 bottom-0 z-20 px-page pb-[max(12px,env(safe-area-inset-bottom))]' : ''}`}
    >
      <div className="mx-auto flex max-w-[390px] items-center gap-1 rounded-full border border-nav-border bg-nav p-1.5 shadow-soft">
        {TABS.slice(0, 2).map(tab)}
        <button
          type="button"
          onClick={onAdd}
          aria-label="Tambah data"
          className="mx-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-nav-plus text-on-nav-plus shadow-soft active:opacity-80"
        >
          <PlusIcon />
        </button>
        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  )
}
