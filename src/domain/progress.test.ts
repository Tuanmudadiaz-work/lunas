import { describe, expect, it } from 'vitest'
import { loanProgress, portfolioSummary } from './progress'
import { makeLoan, makePayment } from './testFactory'

describe('persentase lunas', () => {
  it('total terbayar dibagi pokok awal, termasuk yang dibayar sebelum didata', () => {
    const loan = makeLoan({ principal: 4_000_000, paidBeforeTracking: 1_000_000 })
    const p = loanProgress(loan, [makePayment(loan.id, 600_000)])
    expect(p.principalPaid).toBe(1_600_000)
    expect(p.principalPaidTracked).toBe(600_000)
    expect(p.remainingPrincipal).toBe(2_400_000)
    expect(p.paidPercent).toBe(40)
  })

  it('denda yang bertambah tidak menurunkan persentase', () => {
    const base = makeLoan({ principal: 2_000_000, paidBeforeTracking: 1_700_000, penaltyAccrued: 0 })
    const before = loanProgress(base, [])
    const after = loanProgress({ ...base, penaltyAccrued: 450_000 }, [])
    expect(before.paidPercent).toBe(85)
    expect(after.paidPercent).toBe(85)
    expect(after.remainingPrincipal).toBe(before.remainingPrincipal)
    expect(after.penaltyOutstanding).toBe(450_000)
    expect(after.totalOutstanding).toBe(300_000 + 450_000)
  })

  it('pembayaran denda mengurangi denda tanpa menaikkan persentase', () => {
    const loan = makeLoan({ principal: 1_000_000, penaltyAccrued: 100_000 })
    const p = loanProgress(loan, [makePayment(loan.id, 60_000, { allocation: 'penalty' })])
    expect(p.paidPercent).toBe(0)
    expect(p.penaltyOutstanding).toBe(40_000)
  })

  it('pembayaran denda berlebih tidak membuat denda negatif', () => {
    const loan = makeLoan({ penaltyAccrued: 50_000 })
    expect(loanProgress(loan, [makePayment(loan.id, 80_000, { allocation: 'penalty' })]).penaltyOutstanding).toBe(0)
  })

  it('dibulatkan ke bawah dan baru 100% saat benar-benar lunas', () => {
    const loan = makeLoan({ principal: 1_000_000 })
    expect(loanProgress(loan, [makePayment(loan.id, 999_999)]).paidPercent).toBe(99)
    expect(loanProgress(loan, [makePayment(loan.id, 333_333)]).paidPercent).toBe(33)
    const done = loanProgress(loan, [makePayment(loan.id, 1_000_000)])
    expect(done.paidPercent).toBe(100)
    expect(done.isPaidOff).toBe(true)
  })

  it('bayar lebih dari pokok tidak melewati 100% atau sisa negatif', () => {
    const loan = makeLoan({ principal: 500_000 })
    const p = loanProgress(loan, [makePayment(loan.id, 700_000)])
    expect(p.paidPercent).toBe(100)
    expect(p.remainingPrincipal).toBe(0)
  })

  it('label Hampir lunas mulai 80%, tidak untuk yang sudah lunas', () => {
    const loan = makeLoan({ principal: 1_000_000 })
    expect(loanProgress(loan, [makePayment(loan.id, 799_999)]).isNearlyPaid).toBe(false)
    expect(loanProgress(loan, [makePayment(loan.id, 800_000)]).isNearlyPaid).toBe(true)
    expect(loanProgress(loan, [makePayment(loan.id, 1_000_000)]).isNearlyPaid).toBe(false)
  })

  it('hanya menghitung pembayaran milik pinjaman itu', () => {
    const loan = makeLoan({ id: 'x', principal: 1_000_000 })
    expect(loanProgress(loan, [makePayment('y', 500_000)]).paidPercent).toBe(0)
  })
})

describe('ringkasan semua pinjaman', () => {
  it('menjumlahkan sisa, denda, dan beban harian dari pinjaman aktif', () => {
    const a = makeLoan({ id: 'a', principal: 4_000_000, paidBeforeTracking: 1_600_000, dailyCharge: 20_000 })
    const b = makeLoan({ id: 'b', principal: 2_000_000, paidBeforeTracking: 1_700_000, penaltyAccrued: 50_000, dailyCharge: 5_000 })
    const c = makeLoan({ id: 'c', principal: 1_000_000, dailyCharge: 9_000 })
    const s = portfolioSummary([a, b, c], [makePayment('c', 1_000_000)])
    expect(s.totalPrincipal).toBe(7_000_000)
    expect(s.remainingPrincipal).toBe(2_700_000)
    expect(s.penaltyOutstanding).toBe(50_000)
    expect(s.totalOutstanding).toBe(2_750_000)
    expect(s.paidPercent).toBe(61) // 4.300.000 / 7.000.000 = 61,4%
    expect(s.dailyChargeTotal).toBe(25_000)
    expect(s.activeCount).toBe(2)
    expect(s.paidOffCount).toBe(1)
  })

  it('kosong berarti 0%', () => {
    expect(portfolioSummary([], []).paidPercent).toBe(0)
  })
})
