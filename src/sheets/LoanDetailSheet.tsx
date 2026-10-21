import { useState } from 'react'
import { Button, ProgressBar, Sheet, StatusText } from '../components'
import { repo } from '../db/repo'
import {
  formatDateLong,
  formatDateShort,
  formatDaysUntil,
  formatRupiah,
  loanProgress,
  nextDue,
  paymentsFor,
  todayISO,
  type Loan,
  type Payment,
} from '../domain'
import type { OpenSheet } from '../app/sheets'

type Props = {
  loan: Loan
  payments: Payment[]
  onClose: () => void
  openSheet: OpenSheet
  onDeleted: (message: string) => void
}

export function LoanDetailSheet({ loan, payments, onClose, openSheet, onDeleted }: Props) {
  const today = todayISO()
  const progress = loanProgress(loan, payments)
  const next = nextDue(loan, payments, today)
  const own = paymentsFor(loan.id, payments).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmPayment, setConfirmPayment] = useState<string | null>(null)

  const stats = [
    { label: 'Sisa pokok', value: formatRupiah(progress.remainingPrincipal) },
    { label: 'Sudah lunas', value: `${progress.paidPercent}%` },
    { label: 'Denda tercatat', value: formatRupiah(progress.penaltyOutstanding) },
    { label: 'Bunga/denda per hari', value: formatRupiah(loan.dailyCharge) },
  ]

  return (
    <Sheet title={loan.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="-mt-2 flex items-center justify-between gap-3">
          <StatusText status={loan.ojkStatus} />
          <span className="text-[13px] text-muted">Pokok awal {formatRupiah(loan.principal)}</span>
        </div>

        <ProgressBar value={progress.paidPercent} label={`${loan.name} lunas ${progress.paidPercent}%`} />

        <dl className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-box border border-card-border bg-bg px-3.5 py-2.5">
              <dt className="text-[12px] text-muted">{s.label}</dt>
              <dd className="text-[16px] font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-[14px]">
          {next ? (
            <>
              Jatuh tempo berikutnya <strong>{formatDateLong(next.date)}</strong> ({formatDaysUntil(next.daysUntil).toLowerCase()}):{' '}
              <strong className="tabular-nums">{formatRupiah(next.toPrepare)}</strong>
              {next.penalty > 0 && ` termasuk denda ${formatRupiah(next.penalty)}`}.
            </>
          ) : (
            'Pinjaman ini sudah lunas.'
          )}
        </p>

        <div className="flex gap-2">
          {!progress.isPaidOff && (
            <Button block onClick={() => openSheet({ kind: 'payment', loanId: loan.id })}>
              Catat pembayaran
            </Button>
          )}
          <Button variant="ghost" block={progress.isPaidOff} onClick={() => openSheet({ kind: 'loanForm', loanId: loan.id })}>
            Ubah data
          </Button>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-semibold">Riwayat pembayaran</h3>
          {own.length === 0 ? (
            <p className="text-[14px] text-muted">Belum ada pembayaran yang dicatat.</p>
          ) : (
            <ul className="divide-y divide-card-border rounded-box border border-card-border bg-bg">
              {own.map((p) => (
                <li key={p.id} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold tabular-nums">{formatRupiah(p.amount)}</div>
                    <div className="text-[12px] text-muted">
                      {formatDateShort(p.date)} · {p.allocation === 'principal' ? 'Cicilan / pokok' : 'Denda'}
                    </div>
                  </div>
                  {confirmPayment === p.id ? (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => void repo.deletePayment(p.id).then(() => setConfirmPayment(null))}
                        className="min-h-touch rounded-full px-3 text-[13px] font-semibold text-warn"
                      >
                        Ya, hapus
                      </button>
                      <button type="button" onClick={() => setConfirmPayment(null)} className="min-h-touch px-2 text-[13px] text-muted">
                        Batal
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Hapus pembayaran ${formatRupiah(p.amount)} tanggal ${formatDateShort(p.date)}`}
                      onClick={() => setConfirmPayment(p.id)}
                      className="min-h-touch px-2 text-[13px] font-semibold text-muted"
                    >
                      Hapus
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="border-t border-card-border pt-3">
          {confirmDelete ? (
            <div className="space-y-2" role="alert">
              <p className="text-[14px]">Hapus {loan.name} beserta semua riwayat pembayarannya? Ini nggak bisa dibatalkan.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void repo.deleteLoan(loan.id).then(() => onDeleted(`${loan.name} dihapus.`))}
                  className="min-h-touch flex-1 rounded-full border border-warn text-[15px] font-semibold text-warn"
                >
                  Ya, hapus
                </button>
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-touch w-full text-[14px] font-semibold text-warn">
              Hapus pinjaman
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
