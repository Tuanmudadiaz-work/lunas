import type { ISODate } from './date'
import { formatRupiah } from './money'
import { loanProgress, type LoanProgress } from './progress'
import { nextDue, type ScheduleEntry } from './schedule'
import type { Loan, Payment } from './types'

/** Jatuh tempo dalam sekian hari dianggap mendesak. */
export const URGENT_DAYS = 7

/** 0 = lewat jatuh tempo, 1 = jatuh tempo dalam 7 hari, 2 = masih lama. */
export type UrgencyTier = 0 | 1 | 2

export type ReasonCode = 'overdue' | 'due-today' | 'due-soon' | 'high-charge' | 'nearly-paid' | 'later' | 'check-help'

export type PriorityItem = {
  loan: Loan
  progress: LoanProgress
  next: ScheduleEntry & { daysUntil: number }
  tier: UrgencyTier
  /** Pinjaman belum terdaftar OJK: ditandai 'Cek bantuan dulu', tidak diurutkan bersama yang terdaftar. */
  checkHelpFirst: boolean
  reason: { code: ReasonCode; text: string }
}

function tierOf(daysUntil: number): UrgencyTier {
  if (daysUntil < 0) return 0
  if (daysUntil <= URGENT_DAYS) return 1
  return 2
}

/**
 * Urutan prioritas dari tiga faktor: kedekatan jatuh tempo, beban bunga/denda per hari, dan status OJK.
 * Pinjaman terdaftar diurutkan menurut: tingkat urgensi, lalu beban harian terbesar, lalu jatuh tempo
 * terdekat, lalu sisa pokok terkecil. Pinjaman belum terdaftar tidak dinaikkan prioritasnya: ditaruh
 * terpisah di akhir dengan tanda 'Cek bantuan dulu'. Pinjaman lunas tidak ikut.
 */
export function rankLoans(loans: Loan[], payments: Payment[], today: ISODate): PriorityItem[] {
  const items: PriorityItem[] = []
  for (const loan of loans) {
    const next = nextDue(loan, payments, today)
    if (!next) continue
    const progress = loanProgress(loan, payments)
    const checkHelpFirst = loan.ojkStatus === 'unregistered'
    const tier = tierOf(next.daysUntil)
    items.push({ loan, progress, next, tier, checkHelpFirst, reason: reasonFor(loan, progress, next, tier, checkHelpFirst) })
  }

  const byPriority = (a: PriorityItem, b: PriorityItem) =>
    a.tier - b.tier ||
    b.loan.dailyCharge - a.loan.dailyCharge ||
    a.next.daysUntil - b.next.daysUntil ||
    a.progress.remainingPrincipal - b.progress.remainingPrincipal ||
    a.loan.id.localeCompare(b.loan.id)

  const registered = items.filter((i) => !i.checkHelpFirst).sort(byPriority)
  const unregistered = items.filter((i) => i.checkHelpFirst).sort(byPriority)
  return [...registered, ...unregistered]
}

function reasonFor(
  loan: Loan,
  progress: LoanProgress,
  next: { daysUntil: number },
  tier: UrgencyTier,
  checkHelpFirst: boolean,
): { code: ReasonCode; text: string } {
  const charge = loan.dailyCharge > 0 ? `bunga/denda ${formatRupiah(loan.dailyCharge)}/hari` : ''
  const withCharge = (text: string) => (charge ? `${text} · ${charge}` : text)

  if (checkHelpFirst) return { code: 'check-help', text: 'Belum terdaftar OJK. Cek bantuan dulu' }
  if (tier === 0) return { code: 'overdue', text: withCharge(`Lewat jatuh tempo ${-next.daysUntil} hari`) }
  if (next.daysUntil === 0) return { code: 'due-today', text: withCharge('Jatuh tempo hari ini') }
  if (tier === 1) return { code: 'due-soon', text: withCharge(`Jatuh tempo ${next.daysUntil} hari lagi`) }
  if (progress.isNearlyPaid) return { code: 'nearly-paid', text: `Tinggal ${100 - progress.paidPercent}% lagi lunas` }
  if (loan.dailyCharge > 0) return { code: 'high-charge', text: `Beban ${charge}` }
  return { code: 'later', text: `Jatuh tempo ${next.daysUntil} hari lagi` }
}

export type PlanItem = PriorityItem & {
  /** Nominal dari 'sisa untuk cicilan' yang dialokasikan ke pinjaman ini. */
  allocation: number
  /** Total yang ditagih dalam periode rencana (pokok jatuh tempo berjalan ditambah denda). */
  dueInPeriod: number
}

export type PaymentPlan = {
  /** Pemasukan dikurangi kebutuhan dasar, minimal 0. */
  available: number
  items: PlanItem[]
  allocated: number
  /** Sisa dana setelah semua tagihan periode ini teralokasi. */
  leftover: number
  /** Kekurangan dana untuk tagihan terdaftar dalam periode ini. */
  shortfall: number
}

export type PlanInput = {
  loans: Loan[]
  payments: Payment[]
  monthlyIncome: number
  basicNeeds: number
  today: ISODate
  /** Tagihan yang jatuh tempo dalam sekian hari ikut dialokasikan. Bawaan 30 hari. */
  periodDays?: number
}

/**
 * Rencana bayar: dana tersedia dibagi mengikuti urutan prioritas, sebatas tagihan dalam periode.
 * Pinjaman belum terdaftar OJK tidak mendapat alokasi otomatis; pengguna yang memutuskan setelah cek bantuan.
 * Ini hitungan, bukan keputusan: AI hanya boleh menjelaskannya.
 */
export function buildPaymentPlan({ loans, payments, monthlyIncome, basicNeeds, today, periodDays = 30 }: PlanInput): PaymentPlan {
  const available = Math.max(0, Math.round(monthlyIncome - basicNeeds))
  let budget = available
  let needed = 0

  const items: PlanItem[] = rankLoans(loans, payments, today).map((item) => {
    const inPeriod = item.next.daysUntil <= periodDays
    const dueInPeriod = inPeriod ? item.next.toPrepare : 0
    if (item.checkHelpFirst) return { ...item, dueInPeriod, allocation: 0 }
    needed += dueInPeriod
    const allocation = Math.min(budget, dueInPeriod)
    budget -= allocation
    return { ...item, dueInPeriod, allocation }
  })

  const allocated = available - budget
  return { available, items, allocated, leftover: budget, shortfall: Math.max(0, needed - available) }
}
