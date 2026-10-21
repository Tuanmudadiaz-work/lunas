import { useState } from 'react'
import { Button, FormErrors, MoneyField, Segmented, SelectField, Sheet, TextField } from '../components'
import { repo } from '../db/repo'
import {
  addDays,
  emptyLoanForm,
  formToLoanInput,
  loanToForm,
  todayISO,
  type Loan,
  type LoanFormValues,
  type OjkStatus,
  type RepeatKind,
} from '../domain'

const REPEAT_OPTIONS: { value: RepeatKind; label: string }[] = [
  { value: 'once', label: 'Sekali bayar (lunas di jatuh tempo)' },
  { value: 'monthly', label: 'Cicilan bulanan' },
  { value: 'weekly', label: 'Cicilan mingguan' },
  { value: 'everyNDays', label: 'Cicilan setiap beberapa hari' },
]

type Props = {
  loan?: Loan
  onClose: () => void
  onSaved: (loan: Loan, created: boolean) => void
}

export function LoanFormSheet({ loan, onClose, onSaved }: Props) {
  const [values, setValues] = useState<LoanFormValues>(() => (loan ? loanToForm(loan) : emptyLoanForm(addDays(todayISO(), 7))))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof LoanFormValues>(key: K) => (value: LoanFormValues[K]) => setValues((v) => ({ ...v, [key]: value }))
  const repeating = values.repeat !== 'once'

  const submit = async () => {
    const result = formToLoanInput(values)
    if (!result.input) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    try {
      const saved = loan ? await repo.updateLoan(loan.id, result.input) : await repo.addLoan(result.input)
      onSaved(saved, !loan)
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Gagal menyimpan. Coba lagi.'])
      setSaving(false)
    }
  }

  return (
    <Sheet title={loan ? 'Ubah pinjaman' : 'Tambah pinjaman'} onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <TextField
          label="Nama pinjaman"
          value={values.name}
          onChange={set('name')}
          placeholder="Nama aplikasi atau platform"
          autoComplete="off"
          hint="Cuma disimpan di HP lu, nggak pernah dikirim ke mana-mana."
        />

        <div className="space-y-1.5">
          <span className="block text-[14px] font-semibold">
            Status di OJK
          </span>
          <Segmented<OjkStatus>
            label="Status di OJK"
            value={values.ojkStatus}
            onChange={set('ojkStatus')}
            options={[
              { value: 'registered', label: 'Terdaftar' },
              { value: 'unregistered', label: 'Belum terdaftar' },
            ]}
          />
          <p className="text-[13px] text-muted">Belum yakin? Cek nama platformnya di daftar resmi OJK. Bisa diubah nanti.</p>
        </div>

        <MoneyField label="Pokok awal" value={values.principal} onChange={set('principal')} placeholder="2.400.000" />
        <MoneyField
          label={loan ? 'Sisa pokok saat pertama dicatat' : 'Sisa pokok sekarang'}
          value={values.remaining}
          onChange={set('remaining')}
          placeholder="Sama dengan pokok awal"
          hint={
            loan
              ? 'Pembayaran yang dicatat di aplikasi dihitung terpisah.'
              : 'Kalau sudah pernah bayar sebagian, isi sisanya. Kosongkan kalau belum.'
          }
        />

        <SelectField
          label="Cara bayar"
          value={values.repeat}
          onChange={(v) => set('repeat')(v as RepeatKind)}
          options={REPEAT_OPTIONS}
        />
        {repeating && (
          <>
            {values.repeat === 'everyNDays' && (
              <TextField
                label="Setiap berapa hari"
                value={values.everyDays}
                onChange={set('everyDays')}
                inputMode="numeric"
                placeholder="14"
              />
            )}
            <MoneyField label="Cicilan per jatuh tempo" value={values.installment} onChange={set('installment')} placeholder="500.000" />
            <TextField
              label="Sisa berapa kali cicilan (boleh kosong)"
              value={values.count}
              onChange={set('count')}
              inputMode="numeric"
              placeholder="Misalnya 3"
              hint="Kosongkan kalau nggak tahu; jadwal berhenti saat pokok lunas."
            />
          </>
        )}

        <TextField
          label={repeating ? 'Jatuh tempo cicilan berikutnya' : 'Tanggal jatuh tempo'}
          type="date"
          value={values.firstDue}
          onChange={set('firstDue')}
        />

        <MoneyField
          label="Bunga atau denda per hari (boleh kosong)"
          value={values.dailyCharge}
          onChange={set('dailyCharge')}
          placeholder="0"
          hint="Dipakai untuk menghitung urutan bayar."
        />
        <MoneyField
          label="Denda yang sudah tercatat (boleh kosong)"
          value={values.penaltyAccrued}
          onChange={set('penaltyAccrued')}
          placeholder="0"
          hint="Ditampilkan terpisah, nggak mengurangi persentase lunas."
        />

        <FormErrors errors={errors} />

        <div className="space-y-2 pt-1">
          <Button type="submit" block disabled={saving}>
            {loan ? 'Simpan perubahan' : 'Simpan pinjaman'}
          </Button>
          <button type="button" onClick={onClose} className="min-h-12 w-full text-[15px] font-semibold text-link">
            Batal
          </button>
        </div>
      </form>
    </Sheet>
  )
}
