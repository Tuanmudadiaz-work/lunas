import { useState } from 'react'
import { Button, FormErrors, MoneyField, Segmented, SelectField, Sheet, TextField } from '../components'
import { repo } from '../db/repo'
import {
  formatRupiah,
  loanProgress,
  nextDue,
  parseRupiah,
  todayISO,
  validatePayment,
  type Loan,
  type Payment,
  type PaymentAllocation,
} from '../domain'

type Props = {
  loans: Loan[]
  payments: Payment[]
  loanId?: string
  onClose: () => void
  onSaved: (message: string) => void
}

export function PaymentSheet({ loans, payments, loanId, onClose, onSaved }: Props) {
  const today = todayISO()
  const active = loans.filter((l) => !loanProgress(l, payments).isPaidOff)
  const choices = active.length ? active : loans
  const [selectedId, setSelectedId] = useState(loanId ?? choices[0]?.id ?? '')
  const [allocation, setAllocation] = useState<PaymentAllocation>('principal')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const loan = loans.find((l) => l.id === selectedId)
  const progress = loan ? loanProgress(loan, payments) : null
  const next = loan ? nextDue(loan, payments, today) : null
  const parsed = parseRupiah(amount)

  // Pratinjau dihitung dengan fungsi yang sama seperti layar lain, memakai pembayaran sementara.
  const preview =
    loan && parsed
      ? loanProgress(loan, [...payments, { id: 'preview', loanId: loan.id, amount: parsed, date, allocation, createdAt: 0 }])
      : null

  const suggested = allocation === 'principal' ? next?.amount : progress?.penaltyOutstanding

  const submit = async () => {
    const input = { loanId: selectedId, amount: parsed ?? 0, date, allocation }
    const invalid = amount.trim() && parsed === null ? ['Nominal tidak terbaca. Contoh: 500.000 atau 500rb.'] : validatePayment(input)
    if (date > today) invalid.push('Tanggal pembayaran belum boleh di masa depan.')
    if (invalid.length) {
      setErrors(invalid)
      return
    }
    setSaving(true)
    try {
      await repo.addPayment(input)
      const after = loanProgress(loan!, [...payments, { ...input, id: 'x', createdAt: 0 }])
      onSaved(after.isPaidOff ? `${loan!.name} lunas. Selamat, satu beban selesai.` : `Pembayaran tercatat. ${loan!.name} sekarang ${after.paidPercent}% lunas.`)
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Gagal menyimpan. Coba lagi.'])
      setSaving(false)
    }
  }

  return (
    <Sheet title="Catat pembayaran" onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <SelectField
          label="Pinjaman"
          value={selectedId}
          onChange={setSelectedId}
          options={choices.map((l) => ({ value: l.id, label: l.name }))}
        />

        <div className="space-y-1.5">
          <span className="block text-[14px] font-semibold">Bayar untuk</span>
          <Segmented<PaymentAllocation>
            label="Bayar untuk"
            value={allocation}
            onChange={setAllocation}
            options={[
              { value: 'principal', label: 'Cicilan / pokok' },
              { value: 'penalty', label: 'Denda' },
            ]}
          />
        </div>

        <MoneyField label="Nominal" value={amount} onChange={setAmount} placeholder="500.000" />
        {suggested ? (
          <button
            type="button"
            onClick={() => setAmount(formatRupiah(suggested).replace('Rp', ''))}
            className="-mt-2 min-h-touch text-[14px] font-semibold text-link"
          >
            Isi {allocation === 'principal' ? 'tagihan berjalan' : 'semua denda'}: {formatRupiah(suggested)}
          </button>
        ) : null}

        <TextField label="Tanggal bayar" type="date" value={date} max={today} onChange={setDate} />

        {progress && (
          <div className="rounded-box border border-card-border bg-bg px-4 py-3 text-[14px]" aria-live="polite">
            {preview ? (
              allocation === 'principal' ? (
                <p>
                  Sisa pokok jadi <strong className="tabular-nums">{formatRupiah(preview.remainingPrincipal)}</strong>,{' '}
                  {preview.isPaidOff ? 'lunas.' : `${preview.paidPercent}% lunas.`}
                </p>
              ) : (
                <p>
                  Denda tersisa <strong className="tabular-nums">{formatRupiah(preview.penaltyOutstanding)}</strong>. Persentase lunas tetap{' '}
                  {preview.paidPercent}%.
                </p>
              )
            ) : (
              <p className="text-muted">
                Sekarang: sisa pokok {formatRupiah(progress.remainingPrincipal)}, {progress.paidPercent}% lunas
                {progress.penaltyOutstanding > 0 && `, denda ${formatRupiah(progress.penaltyOutstanding)}`}.
              </p>
            )}
          </div>
        )}

        <FormErrors errors={errors} />

        <div className="space-y-2 pt-1">
          <Button type="submit" block disabled={saving || !selectedId}>
            Simpan pembayaran
          </Button>
          <button type="button" onClick={onClose} className="min-h-12 w-full text-[15px] font-semibold text-link">
            Batal
          </button>
        </div>
      </form>
    </Sheet>
  )
}
