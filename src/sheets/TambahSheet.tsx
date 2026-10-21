import type { ComponentType, SVGProps } from 'react'
import { Sheet } from '../components'
import { CheckCircleBigIcon, FilePlusIcon } from '../components/icons'
import type { OpenSheet } from '../app/sheets'

export function TambahSheet({ hasLoans, onClose, openSheet }: { hasLoans: boolean; onClose: () => void; openSheet: OpenSheet }) {
  return (
    <Sheet title="Mau catat apa?" onClose={onClose}>
      <div className="space-y-3">
        <Choice
          Icon={FilePlusIcon}
          title="Tambah pinjaman baru"
          body="Platform, pokok, bunga atau denda, jatuh tempo"
          onClick={() => openSheet({ kind: 'loanForm' })}
        />
        <Choice
          Icon={CheckCircleBigIcon}
          title="Catat pembayaran"
          body={hasLoans ? 'Sisa pokok berkurang otomatis' : 'Tambah pinjaman dulu, baru bisa catat pembayaran'}
          disabled={!hasLoans}
          onClick={() => openSheet({ kind: 'payment' })}
        />
        <button type="button" onClick={onClose} className="min-h-12 w-full text-[15px] font-semibold text-link">
          Batal
        </button>
      </div>
    </Sheet>
  )
}

type ChoiceProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  body: string
  disabled?: boolean
  onClick: () => void
}

function Choice({ Icon, title, body, disabled, onClick }: ChoiceProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[72px] w-full items-center gap-3.5 rounded-box border border-card-border bg-bg px-3.5 py-3 text-left disabled:opacity-60"
    >
      <span className="flex size-touch shrink-0 items-center justify-center rounded-[14px] bg-track text-link">
        <Icon width={22} height={22} />
      </span>
      <span className="space-y-0.5">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-[13px] leading-snug text-muted">{body}</span>
      </span>
    </button>
  )
}
