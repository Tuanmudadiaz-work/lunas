import type { Loan, Payment } from './types'

/** Pembuat data uji. Hanya dipakai oleh tes. */
export function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-a',
    name: 'Pinjaman A',
    principal: 1_000_000,
    paidBeforeTracking: 0,
    dailyCharge: 0,
    penaltyAccrued: 0,
    firstDue: '2026-10-25',
    recurrence: { kind: 'once' },
    ojkStatus: 'registered',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

let seq = 0
export function makePayment(loanId: string, amount: number, overrides: Partial<Payment> = {}): Payment {
  seq += 1
  return { id: `pay-${seq}`, loanId, amount, date: '2026-10-21', allocation: 'principal', createdAt: seq, ...overrides }
}
