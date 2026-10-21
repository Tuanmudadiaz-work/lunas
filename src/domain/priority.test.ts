import { describe, expect, it } from 'vitest'
import { buildPaymentPlan, rankLoans } from './priority'
import { makeLoan, makePayment } from './testFactory'

const TODAY = '2026-10-21'

describe('urutan prioritas', () => {
  it('lewat jatuh tempo lebih dulu, lalu yang dekat, lalu yang masih lama', () => {
    const later = makeLoan({ id: 'later', firstDue: '2026-11-30', dailyCharge: 50_000 })
    const soon = makeLoan({ id: 'soon', firstDue: '2026-10-25' })
    const overdue = makeLoan({ id: 'overdue', firstDue: '2026-10-18' })
    expect(rankLoans([later, soon, overdue], [], TODAY).map((i) => i.loan.id)).toEqual(['overdue', 'soon', 'later'])
  })

  it('dalam tingkat yang sama, beban harian terbesar lebih dulu', () => {
    const cheap = makeLoan({ id: 'cheap', firstDue: '2026-10-23', dailyCharge: 2_000 })
    const costly = makeLoan({ id: 'costly', firstDue: '2026-10-27', dailyCharge: 15_000 })
    expect(rankLoans([cheap, costly], [], TODAY).map((i) => i.loan.id)).toEqual(['costly', 'cheap'])
  })

  it('beban sama: jatuh tempo terdekat, lalu sisa pokok terkecil', () => {
    const a = makeLoan({ id: 'a', firstDue: '2026-10-26', principal: 500_000 })
    const b = makeLoan({ id: 'b', firstDue: '2026-10-24', principal: 2_000_000 })
    const c = makeLoan({ id: 'c', firstDue: '2026-10-26', principal: 300_000 })
    expect(rankLoans([a, b, c], [], TODAY).map((i) => i.loan.id)).toEqual(['b', 'c', 'a'])
  })

  it('belum terdaftar OJK tidak dinaikkan prioritasnya walau mendesak dan mahal', () => {
    const illegal = makeLoan({ id: 'illegal', ojkStatus: 'unregistered', firstDue: '2026-10-10', dailyCharge: 100_000 })
    const legal = makeLoan({ id: 'legal', firstDue: '2026-11-30' })
    const ranked = rankLoans([illegal, legal], [], TODAY)
    expect(ranked.map((i) => i.loan.id)).toEqual(['legal', 'illegal'])
    expect(ranked[1].checkHelpFirst).toBe(true)
    expect(ranked[1].reason).toEqual({ code: 'check-help', text: 'Belum terdaftar OJK. Cek bantuan dulu' })
  })

  it('pinjaman lunas tidak ikut', () => {
    const done = makeLoan({ id: 'done', principal: 500_000 })
    expect(rankLoans([done], [makePayment('done', 500_000)], TODAY)).toEqual([])
  })

  it('alasan satu baris dihitung kode', () => {
    const reasons = rankLoans(
      [
        makeLoan({ id: 'o', firstDue: '2026-10-18', dailyCharge: 20_000 }),
        makeLoan({ id: 't', firstDue: TODAY }),
        makeLoan({ id: 's', firstDue: '2026-10-24' }),
        makeLoan({ id: 'n', firstDue: '2026-12-01', principal: 1_000_000, paidBeforeTracking: 850_000 }),
        makeLoan({ id: 'l', firstDue: '2026-12-01' }),
      ],
      [],
      TODAY,
    ).map((i) => [i.loan.id, i.reason.code, i.reason.text])
    expect(reasons).toEqual([
      ['o', 'overdue', 'Lewat jatuh tempo 3 hari · bunga/denda Rp20.000/hari'],
      ['t', 'due-today', 'Jatuh tempo hari ini'],
      ['s', 'due-soon', 'Jatuh tempo 3 hari lagi'],
      ['n', 'nearly-paid', 'Tinggal 15% lagi lunas'],
      ['l', 'later', 'Jatuh tempo 41 hari lagi'],
    ])
  })
})

describe('rencana bayar', () => {
  const loans = [
    makeLoan({ id: 'a', principal: 600_000, firstDue: '2026-10-24', dailyCharge: 10_000 }),
    makeLoan({ id: 'b', principal: 900_000, installment: 300_000, firstDue: '2026-10-28', recurrence: { kind: 'monthly' } }),
    makeLoan({ id: 'c', principal: 400_000, firstDue: '2026-10-26', ojkStatus: 'unregistered' }),
    makeLoan({ id: 'd', principal: 1_000_000, firstDue: '2027-01-15' }),
  ]

  it('sisa untuk cicilan = pemasukan dikurangi kebutuhan dasar, dibagi menurut urutan', () => {
    const plan = buildPaymentPlan({ loans, payments: [], monthlyIncome: 4_000_000, basicNeeds: 3_200_000, today: TODAY })
    expect(plan.available).toBe(800_000)
    expect(plan.items.map((i) => [i.loan.id, i.dueInPeriod, i.allocation])).toEqual([
      ['a', 600_000, 600_000],
      ['b', 300_000, 200_000],
      ['d', 0, 0],
      ['c', 400_000, 0],
    ])
    expect(plan.allocated).toBe(800_000)
    expect(plan.leftover).toBe(0)
    expect(plan.shortfall).toBe(100_000)
  })

  it('dana berlebih tidak dipaksakan ke tagihan di luar periode', () => {
    const plan = buildPaymentPlan({ loans, payments: [], monthlyIncome: 5_000_000, basicNeeds: 2_000_000, today: TODAY })
    expect(plan.allocated).toBe(900_000)
    expect(plan.leftover).toBe(2_100_000)
    expect(plan.shortfall).toBe(0)
  })

  it('kebutuhan dasar lebih besar dari pemasukan berarti tidak ada dana, bukan negatif', () => {
    const plan = buildPaymentPlan({ loans, payments: [], monthlyIncome: 2_000_000, basicNeeds: 2_500_000, today: TODAY })
    expect(plan.available).toBe(0)
    expect(plan.items.every((i) => i.allocation === 0)).toBe(true)
    expect(plan.shortfall).toBe(900_000)
  })

  it('denda yang belum dibayar ikut tagihan periode', () => {
    const plan = buildPaymentPlan({
      loans: [makeLoan({ id: 'x', principal: 500_000, penaltyAccrued: 70_000, firstDue: '2026-10-19' })],
      payments: [],
      monthlyIncome: 1_000_000,
      basicNeeds: 0,
      today: TODAY,
    })
    expect(plan.items[0]).toMatchObject({ dueInPeriod: 570_000, allocation: 570_000 })
  })
})
