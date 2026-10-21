import type { Loan, Payment } from './types'

export type LoanProgress = {
  /** Pokok yang sudah dibayar, termasuk sebelum pinjaman didata. */
  principalPaid: number
  /** Pembayaran pokok yang dicatat di aplikasi saja (tanpa yang sebelum didata). */
  principalPaidTracked: number
  remainingPrincipal: number
  /** 0 sampai 100, dibulatkan ke bawah supaya tidak terlihat lunas sebelum benar-benar lunas. */
  paidPercent: number
  penaltyOutstanding: number
  /** Sisa pokok ditambah denda yang belum dibayar. */
  totalOutstanding: number
  isPaidOff: boolean
  /** Label 'Hampir lunas' mulai 80%. */
  isNearlyPaid: boolean
}

export const NEARLY_PAID_PERCENT = 80

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

export function paymentsFor(loanId: string, payments: Payment[]): Payment[] {
  return payments.filter((p) => p.loanId === loanId)
}

/**
 * Persentase lunas = total pokok terbayar dibagi pokok awal. Denda yang bertambah tidak menurunkan
 * persentase (angka tidak pernah mundur), dan pembayaran denda tidak menaikkannya.
 */
export function loanProgress(loan: Loan, payments: Payment[]): LoanProgress {
  const own = paymentsFor(loan.id, payments)
  const principalPaidTracked = sum(own.filter((p) => p.allocation === 'principal').map((p) => p.amount))
  const penaltyPaid = sum(own.filter((p) => p.allocation === 'penalty').map((p) => p.amount))

  const principalPaid = loan.paidBeforeTracking + principalPaidTracked
  const remainingPrincipal = Math.max(0, loan.principal - principalPaid)
  const isPaidOff = remainingPrincipal === 0
  const paidPercent = isPaidOff ? 100 : percentFloor(principalPaid, loan.principal)
  const penaltyOutstanding = Math.max(0, loan.penaltyAccrued - penaltyPaid)

  return {
    principalPaid,
    principalPaidTracked,
    remainingPrincipal,
    paidPercent,
    penaltyOutstanding,
    totalOutstanding: remainingPrincipal + penaltyOutstanding,
    isPaidOff,
    isNearlyPaid: !isPaidOff && paidPercent >= NEARLY_PAID_PERCENT,
  }
}

function percentFloor(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.min(99, Math.max(0, Math.floor((part * 100) / whole)))
}

export type PortfolioSummary = {
  totalPrincipal: number
  principalPaid: number
  remainingPrincipal: number
  penaltyOutstanding: number
  totalOutstanding: number
  paidPercent: number
  /** Jumlah bunga atau denda per hari dari pinjaman yang belum lunas. */
  dailyChargeTotal: number
  activeCount: number
  paidOffCount: number
}

/** Ringkasan semua pinjaman untuk Beranda. Persentase total memakai rumus yang sama dengan per pinjaman. */
export function portfolioSummary(loans: Loan[], payments: Payment[]): PortfolioSummary {
  const rows = loans.map((loan) => ({ loan, progress: loanProgress(loan, payments) }))
  const active = rows.filter((r) => !r.progress.isPaidOff)
  const totalPrincipal = sum(loans.map((l) => l.principal))
  const principalPaid = sum(rows.map((r) => Math.min(r.progress.principalPaid, r.loan.principal)))
  const remainingPrincipal = sum(rows.map((r) => r.progress.remainingPrincipal))
  const penaltyOutstanding = sum(rows.map((r) => r.progress.penaltyOutstanding))

  return {
    totalPrincipal,
    principalPaid,
    remainingPrincipal,
    penaltyOutstanding,
    totalOutstanding: remainingPrincipal + penaltyOutstanding,
    paidPercent: remainingPrincipal === 0 && loans.length > 0 ? 100 : percentFloor(principalPaid, totalPrincipal),
    dailyChargeTotal: sum(active.map((r) => r.loan.dailyCharge)),
    activeCount: active.length,
    paidOffCount: rows.length - active.length,
  }
}
