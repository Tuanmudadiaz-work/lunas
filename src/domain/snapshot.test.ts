import { describe, expect, it } from 'vitest'
import { aliasFor, buildSnapshot } from './snapshot'
import { makeLoan, makePayment } from './testFactory'

describe('ringkasan anonim untuk AI', () => {
  const loans = [
    makeLoan({ id: 'x', name: 'KrediKilat', createdAt: 2, principal: 1_000_000, firstDue: '2026-10-24', ojkStatus: 'unregistered' }),
    makeLoan({ id: 'y', name: 'DanaKu Sejahtera', createdAt: 1, principal: 2_000_000, paidBeforeTracking: 1_700_000, dailyCharge: 5_000 }),
    makeLoan({ id: 'z', name: 'Lunas Duluan', createdAt: 3, principal: 500_000 }),
  ]
  const payments = [makePayment('z', 500_000)]

  it('memakai alias menurut urutan dibuat dan tidak membawa nama, id, atau tanggal', () => {
    const snap = buildSnapshot(loans, payments, '2026-10-21', { monthlyIncome: 4_000_000, basicNeeds: 3_200_000 })
    const json = JSON.stringify(snap)
    for (const secret of ['KrediKilat', 'DanaKu', 'Lunas Duluan', '"x"', '"y"', '2026-']) expect(json).not.toContain(secret)
    expect(snap.loans.map((l) => l.alias)).toEqual(['Pinjaman A', 'Pinjaman B'])
    expect(snap.loans[0]).toMatchObject({ remaining: 300_000, paidPercent: 85, dailyCharge: 5_000, ojkRegistered: true })
    expect(snap.loans[1]).toMatchObject({ daysUntilDue: 3, ojkRegistered: false })
    expect(snap).toMatchObject({ activeCount: 2, paidOffCount: 1, remainingTotal: 1_300_000, monthlyAvailable: 800_000 })
  })

  it('tanpa anggaran berarti monthlyAvailable null', () => {
    expect(buildSnapshot(loans, payments, '2026-10-21').monthlyAvailable).toBeNull()
  })

  it('alias setelah Z memakai angka', () => {
    expect(aliasFor(0)).toBe('Pinjaman A')
    expect(aliasFor(25)).toBe('Pinjaman Z')
    expect(aliasFor(26)).toBe('Pinjaman 27')
  })
})
