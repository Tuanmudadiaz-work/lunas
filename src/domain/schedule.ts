import { addDays, addMonths, compareISODate, daysBetween, parseISODate, type ISODate } from './date'
import { loanProgress, paymentsFor } from './progress'
import type { Loan, Payment } from './types'

/** Tanggal jatuh tempo ke-k (mulai 0 = `firstDue`). */
export function occurrenceDate(loan: Loan, k: number): ISODate {
  const r = loan.recurrence
  switch (r.kind) {
    case 'once':
      return loan.firstDue
    case 'monthly':
      return addMonths(loan.firstDue, k, parseISODate(loan.firstDue).d)
    case 'weekly':
      return addDays(loan.firstDue, 7 * k)
    case 'everyNDays':
      return addDays(loan.firstDue, Math.max(1, r.days) * k)
  }
}

export type DueStatus = 'paid' | 'overdue' | 'due' | 'upcoming'

export type ScheduleEntry = {
  loanId: string
  index: number
  date: ISODate
  /** Pokok yang ditagih pada jatuh tempo ini. */
  amount: number
  /** Denda yang belum dibayar, hanya diisi pada jatuh tempo yang sedang berjalan. */
  penalty: number
  /** Total yang perlu disiapkan: pokok ditambah denda. */
  toPrepare: number
  status: DueStatus
}

type Plan = {
  /** Jatuh tempo yang sedang berjalan (belum terbayar penuh), atau null jika lunas. */
  current: number | null
  /** Jumlah jatuh tempo yang punya tagihan. */
  total: number
  installment: number | null
  /** Sisa tagihan pokok pada jatuh tempo yang sedang berjalan. */
  currentAmount: number
  remaining: number
  penalty: number
}

/**
 * Pembayaran pokok sejak didata dipakai untuk menutup jatuh tempo berurutan.
 * Tanpa nominal cicilan, seluruh sisa pokok ditagih di satu jatuh tempo.
 */
function planFor(loan: Loan, payments: Payment[]): Plan {
  const progress = loanProgress(loan, payments)
  const remaining = progress.remainingPrincipal
  const penalty = progress.penaltyOutstanding
  const installment =
    loan.recurrence.kind !== 'once' && loan.installment && loan.installment > 0 ? loan.installment : null

  if (installment === null) {
    return { current: remaining > 0 ? 0 : null, total: 1, installment, currentAmount: remaining, remaining, penalty }
  }

  const paid = progress.principalPaidTracked
  const covered = Math.floor(paid / installment)
  const neededForRest = remaining > 0 ? Math.ceil((remaining + (paid - covered * installment)) / installment) : 0
  const count = 'count' in loan.recurrence ? loan.recurrence.count : undefined
  const total = Math.max(1, count ?? covered + neededForRest)

  if (remaining === 0) return { current: null, total: Math.min(total, Math.max(covered, 1)), installment, currentAmount: 0, remaining, penalty }

  const current = Math.min(covered, total - 1)
  const isLast = current === total - 1
  const currentAmount = isLast ? remaining : Math.min(remaining, installment - (paid - covered * installment))
  return { current, total, installment, currentAmount, remaining, penalty }
}

function amountAt(plan: Plan, k: number): number {
  if (plan.current === null || k < plan.current) return plan.installment ?? 0
  if (k === plan.current) return plan.currentAmount
  const before = plan.currentAmount + (plan.installment ?? 0) * (k - plan.current - 1)
  const left = Math.max(0, plan.remaining - before)
  return k === plan.total - 1 ? left : Math.min(plan.installment ?? 0, left)
}

function statusAt(plan: Plan, k: number, date: ISODate, today: ISODate): DueStatus {
  if (plan.current === null || k < plan.current) return 'paid'
  if (k > plan.current) return 'upcoming'
  return compareISODate(date, today) < 0 ? 'overdue' : 'due'
}

function entryAt(loan: Loan, plan: Plan, k: number, today: ISODate): ScheduleEntry {
  const date = occurrenceDate(loan, k)
  const amount = amountAt(plan, k)
  const penalty = k === plan.current ? plan.penalty : 0
  return { loanId: loan.id, index: k, date, amount, penalty, toPrepare: amount + penalty, status: statusAt(plan, k, date, today) }
}

/** Jatuh tempo yang sedang berjalan (bisa sudah lewat), atau null jika pinjaman lunas. */
export function nextDue(loan: Loan, payments: Payment[], today: ISODate): (ScheduleEntry & { daysUntil: number }) | null {
  const plan = planFor(loan, paymentsFor(loan.id, payments))
  if (plan.current === null) return null
  const entry = entryAt(loan, plan, plan.current, today)
  return { ...entry, daysUntil: daysBetween(today, entry.date) }
}

/** Semua jatuh tempo satu pinjaman yang jatuh di rentang [from, to], termasuk yang sudah terbayar. */
export function scheduleInRange(loan: Loan, payments: Payment[], from: ISODate, to: ISODate, today: ISODate): ScheduleEntry[] {
  const plan = planFor(loan, paymentsFor(loan.id, payments))
  const entries: ScheduleEntry[] = []
  for (let k = 0; k < plan.total; k++) {
    const date = occurrenceDate(loan, k)
    if (compareISODate(date, to) > 0) break
    if (compareISODate(date, from) >= 0) entries.push(entryAt(loan, plan, k, today))
  }
  return entries
}

export type CalendarDay = {
  date: ISODate
  entries: ScheduleEntry[]
  /** Total yang harus disiapkan di tanggal ini (tidak termasuk yang sudah terbayar). */
  totalToPrepare: number
}

/** Titik kalender per tanggal untuk rentang [from, to], urut tanggal. */
export function calendarDays(loans: Loan[], payments: Payment[], from: ISODate, to: ISODate, today: ISODate): CalendarDay[] {
  const byDate = new Map<ISODate, ScheduleEntry[]>()
  for (const loan of loans) {
    for (const entry of scheduleInRange(loan, payments, from, to, today)) {
      byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry])
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => compareISODate(a, b))
    .map(([date, entries]) => ({
      date,
      entries,
      totalToPrepare: entries.filter((e) => e.status !== 'paid').reduce((s, e) => s + e.toPrepare, 0),
    }))
}
