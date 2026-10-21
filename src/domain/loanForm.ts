import { formatRupiah, parseRupiah } from './money'
import type { Loan, OjkStatus, Recurrence } from './types'
import { validateLoan, type LoanInput } from './validate'

export type RepeatKind = Recurrence['kind']

/** Isian form pinjaman apa adanya (teks), sebelum dibaca jadi angka. */
export type LoanFormValues = {
  name: string
  ojkStatus: OjkStatus
  principal: string
  /** Sisa pokok saat didata. Kosong berarti sama dengan pokok awal. */
  remaining: string
  repeat: RepeatKind
  everyDays: string
  installment: string
  /** Jumlah cicilan tersisa, termasuk yang berikutnya. Boleh kosong. */
  count: string
  firstDue: string
  dailyCharge: string
  penaltyAccrued: string
}

export function emptyLoanForm(firstDue: string): LoanFormValues {
  return {
    name: '',
    ojkStatus: 'registered',
    principal: '',
    remaining: '',
    repeat: 'once',
    everyDays: '30',
    installment: '',
    count: '',
    firstDue,
    dailyCharge: '',
    penaltyAccrued: '',
  }
}

/** Nominal untuk isian form: '2.400.000' tanpa 'Rp', kosong untuk nol. */
const moneyText = (n: number) => (n ? formatRupiah(n).replace('Rp', '') : '')

export function loanToForm(loan: Loan): LoanFormValues {
  const r = loan.recurrence
  return {
    name: loan.name,
    ojkStatus: loan.ojkStatus,
    principal: moneyText(loan.principal),
    remaining: moneyText(loan.principal - loan.paidBeforeTracking) || '0',
    repeat: r.kind,
    everyDays: r.kind === 'everyNDays' ? String(r.days) : '30',
    installment: moneyText(loan.installment ?? 0),
    count: 'count' in r && r.count ? String(r.count) : '',
    firstDue: loan.firstDue,
    dailyCharge: moneyText(loan.dailyCharge),
    penaltyAccrued: moneyText(loan.penaltyAccrued),
  }
}

type Result = { input: LoanInput; errors: [] } | { input: null; errors: string[] }

/** Membaca isian form menjadi data pinjaman, dengan pesan salah yang siap ditampilkan. */
export function formToLoanInput(v: LoanFormValues): Result {
  const errors: string[] = []
  const money = (text: string, label: string, optional: boolean): number => {
    if (!text.trim()) {
      if (!optional) errors.push(`${label} wajib diisi.`)
      return 0
    }
    const n = parseRupiah(text)
    if (n === null) errors.push(`${label} tidak terbaca. Contoh: 2.400.000 atau 500rb.`)
    return n ?? 0
  }
  const whole = (text: string, label: string): number | undefined => {
    if (!text.trim()) return undefined
    const n = Number(text.trim())
    if (!Number.isInteger(n) || n < 1) {
      errors.push(`${label} harus angka bulat minimal 1.`)
      return undefined
    }
    return n
  }

  const principal = money(v.principal, 'Pokok awal', false)
  const remaining = v.remaining.trim() ? money(v.remaining, 'Sisa pokok', false) : principal
  const dailyCharge = money(v.dailyCharge, 'Bunga atau denda per hari', true)
  const penaltyAccrued = money(v.penaltyAccrued, 'Denda tercatat', true)

  let recurrence: Recurrence = { kind: 'once' }
  let installment: number | undefined
  if (v.repeat !== 'once') {
    installment = money(v.installment, 'Cicilan per jatuh tempo', false) || undefined
    const count = whole(v.count, 'Jumlah cicilan')
    if (v.repeat === 'everyNDays') recurrence = { kind: 'everyNDays', days: whole(v.everyDays, 'Jarak hari') ?? 0, count }
    else recurrence = { kind: v.repeat, count }
  }
  if (remaining > principal) errors.push('Sisa pokok tidak boleh lebih besar dari pokok awal.')
  if (errors.length) return { input: null, errors }

  const input: LoanInput = {
    name: v.name,
    ojkStatus: v.ojkStatus,
    principal,
    paidBeforeTracking: principal - remaining,
    dailyCharge,
    penaltyAccrued,
    installment,
    firstDue: v.firstDue,
    recurrence,
  }
  const invalid = validateLoan(input)
  return invalid.length ? { input: null, errors: invalid } : { input, errors: [] }
}
