import type { ISODate } from './date'
import { loanProgress, portfolioSummary } from './progress'
import { nextDue } from './schedule'
import type { Loan, Payment } from './types'

/**
 * Ringkasan kondisi keuangan yang boleh dikirim ke AI. Tanpa nama platform, tanpa tanggal persis,
 * tanpa id: pinjaman diganti alias 'Pinjaman A', 'Pinjaman B', ... menurut urutan dibuat.
 * Semua angka dihitung kode; AI hanya membaca.
 */
export type LoanSnapshot = {
  alias: string
  remaining: number
  paidPercent: number
  penalty: number
  dailyCharge: number
  /** Negatif berarti lewat jatuh tempo. */
  daysUntilDue: number
  nextAmount: number
  ojkRegistered: boolean
}

export type FinanceSnapshot = {
  loans: LoanSnapshot[]
  activeCount: number
  paidOffCount: number
  remainingTotal: number
  penaltyTotal: number
  paidPercent: number
  dailyChargeTotal: number
  /** Pemasukan dikurangi kebutuhan dasar, jika pengguna sudah mengisinya. */
  monthlyAvailable: number | null
}

export function aliasFor(index: number): string {
  return index < 26 ? `Pinjaman ${String.fromCharCode(65 + index)}` : `Pinjaman ${index + 1}`
}

/** Alias per id pinjaman. Peta ini hanya ada di HP, untuk menerjemahkan balik jawaban AI. */
export function aliasMap(loans: Loan[]): Map<string, string> {
  return new Map([...loans].sort((a, b) => a.createdAt - b.createdAt).map((l, i) => [l.id, aliasFor(i)]))
}

export function buildSnapshot(
  loans: Loan[],
  payments: Payment[],
  today: ISODate,
  budget?: { monthlyIncome: number; basicNeeds: number },
): FinanceSnapshot {
  const aliases = aliasMap(loans)
  const summary = portfolioSummary(loans, payments)
  const active: LoanSnapshot[] = []
  for (const loan of loans) {
    const next = nextDue(loan, payments, today)
    if (!next) continue
    const progress = loanProgress(loan, payments)
    active.push({
      alias: aliases.get(loan.id)!,
      remaining: progress.remainingPrincipal,
      paidPercent: progress.paidPercent,
      penalty: progress.penaltyOutstanding,
      dailyCharge: loan.dailyCharge,
      daysUntilDue: next.daysUntil,
      nextAmount: next.toPrepare,
      ojkRegistered: loan.ojkStatus === 'registered',
    })
  }
  active.sort((a, b) => a.alias.localeCompare(b.alias, 'en', { numeric: true }))
  return {
    loans: active,
    activeCount: summary.activeCount,
    paidOffCount: summary.paidOffCount,
    remainingTotal: summary.remainingPrincipal,
    penaltyTotal: summary.penaltyOutstanding,
    paidPercent: summary.paidPercent,
    dailyChargeTotal: summary.dailyChargeTotal,
    monthlyAvailable: budget && budget.monthlyIncome > 0 ? Math.max(0, budget.monthlyIncome - budget.basicNeeds) : null,
  }
}
