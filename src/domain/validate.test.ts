import { describe, expect, it } from 'vitest'
import { makeLoan } from './testFactory'
import { validateLoan, validatePayment, type LoanInput } from './validate'

const { id: _id, createdAt: _c, updatedAt: _u, ...validLoan } = makeLoan()

const loan = (patch: Partial<LoanInput>): LoanInput => ({ ...validLoan, ...patch })

describe('validasi pinjaman', () => {
  it('isian lengkap lolos', () => {
    expect(validateLoan(validLoan)).toEqual([])
  })

  it.each<[string, Partial<LoanInput>]>([
    ['nama kosong', { name: '  ' }],
    ['pokok nol', { principal: 0 }],
    ['pokok pecahan', { principal: 1000.5 }],
    ['sudah dibayar melebihi pokok', { paidBeforeTracking: 2_000_000 }],
    ['beban harian negatif', { dailyCharge: -1 }],
    ['denda negatif', { penaltyAccrued: -5 }],
    ['cicilan nol', { installment: 0 }],
    ['tanggal tidak ada', { firstDue: '2026-02-30' }],
    ['tenor nol', { recurrence: { kind: 'monthly', count: 0 } }],
    ['jarak hari nol', { recurrence: { kind: 'everyNDays', days: 0 } }],
  ])('menolak %s', (_label, patch) => {
    expect(validateLoan(loan(patch))).toHaveLength(1)
  })
})

describe('validasi pembayaran', () => {
  const ok = { loanId: 'a', amount: 100_000, date: '2026-10-21', allocation: 'principal' as const }

  it('isian lengkap lolos', () => {
    expect(validatePayment(ok)).toEqual([])
  })

  it('menolak nominal nol dan tanggal salah', () => {
    expect(validatePayment({ ...ok, amount: 0 })).toHaveLength(1)
    expect(validatePayment({ ...ok, date: '21-10-2026' })).toHaveLength(1)
    expect(validatePayment({ ...ok, loanId: '' })).toHaveLength(1)
  })
})
