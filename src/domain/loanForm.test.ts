import { describe, expect, it } from 'vitest'
import { emptyLoanForm, formToLoanInput, loanToForm, type LoanFormValues } from './loanForm'
import { makeLoan } from './testFactory'

const form = (patch: Partial<LoanFormValues>): LoanFormValues => ({ ...emptyLoanForm('2026-10-25'), name: 'Pinjaman A', ...patch })

describe('form pinjaman', () => {
  it('sekali bayar: sisa kosong berarti sama dengan pokok', () => {
    const r = formToLoanInput(form({ principal: '2.400.000', dailyCharge: '20rb' }))
    expect(r.errors).toEqual([])
    expect(r.input).toMatchObject({ principal: 2_400_000, paidBeforeTracking: 0, dailyCharge: 20_000, recurrence: { kind: 'once' } })
    expect(r.input?.installment).toBeUndefined()
  })

  it('sisa pokok menjadi yang sudah dibayar sebelum didata', () => {
    expect(formToLoanInput(form({ principal: '4jt', remaining: '2,4jt' })).input?.paidBeforeTracking).toBe(1_600_000)
  })

  it('cicilan bulanan dengan jumlah cicilan', () => {
    const r = formToLoanInput(form({ principal: '3.000.000', repeat: 'monthly', installment: '1jt', count: '3' }))
    expect(r.input).toMatchObject({ installment: 1_000_000, recurrence: { kind: 'monthly', count: 3 } })
  })

  it('setiap n hari', () => {
    const r = formToLoanInput(form({ principal: '1jt', repeat: 'everyNDays', everyDays: '14', installment: '250rb' }))
    expect(r.input?.recurrence).toEqual({ kind: 'everyNDays', days: 14, count: undefined })
  })

  it('cicilan wajib diisi untuk tagihan berulang', () => {
    expect(formToLoanInput(form({ principal: '1jt', repeat: 'weekly' })).errors).toEqual(['Cicilan per jatuh tempo wajib diisi.'])
  })

  it('pesan jelas untuk isian yang salah', () => {
    const r = formToLoanInput(form({ name: '', principal: 'banyak', remaining: '' }))
    expect(r.input).toBeNull()
    expect(r.errors).toContain('Pokok awal tidak terbaca. Contoh: 2.400.000 atau 500rb.')
    expect(formToLoanInput(form({ principal: '1jt', remaining: '2jt' })).errors).toEqual([
      'Sisa pokok tidak boleh lebih besar dari pokok awal.',
    ])
    expect(formToLoanInput(form({ principal: '1jt' , name: ' ' })).errors).toEqual(['Nama pinjaman wajib diisi.'])
  })

  it('bolak-balik dari data pinjaman ke form', () => {
    const loan = makeLoan({
      principal: 3_000_000,
      paidBeforeTracking: 500_000,
      installment: 1_000_000,
      dailyCharge: 15_000,
      recurrence: { kind: 'monthly', count: 3 },
    })
    const { id: _i, createdAt: _c, updatedAt: _u, ...input } = loan
    expect(formToLoanInput(loanToForm(loan)).input).toEqual(input)
  })
})
