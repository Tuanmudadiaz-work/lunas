import { describe, expect, it } from 'vitest'
import { calendarDays, nextDue, occurrenceDate, scheduleInRange } from './schedule'
import { makeLoan, makePayment } from './testFactory'

const TODAY = '2026-10-21'

describe('tanggal jatuh tempo dari aturan pengulangan', () => {
  it('bulanan menjaga tanggal patokan di akhir bulan', () => {
    const loan = makeLoan({ firstDue: '2026-01-31', recurrence: { kind: 'monthly' } })
    expect([0, 1, 2, 3].map((k) => occurrenceDate(loan, k))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('mingguan dan setiap n hari', () => {
    const weekly = makeLoan({ firstDue: '2026-10-28', recurrence: { kind: 'weekly' } })
    expect(occurrenceDate(weekly, 2)).toBe('2026-11-11')
    const every14 = makeLoan({ firstDue: '2026-10-25', recurrence: { kind: 'everyNDays', days: 14 } })
    expect(occurrenceDate(every14, 1)).toBe('2026-11-08')
  })
})

describe('jatuh tempo berjalan', () => {
  it('sekali bayar: seluruh sisa ditagih, ditambah denda', () => {
    const loan = makeLoan({ principal: 1_500_000, paidBeforeTracking: 500_000, penaltyAccrued: 30_000, firstDue: '2026-10-24' })
    expect(nextDue(loan, [], TODAY)).toMatchObject({
      date: '2026-10-24',
      amount: 1_000_000,
      penalty: 30_000,
      toPrepare: 1_030_000,
      status: 'due',
      daysUntil: 3,
    })
  })

  it('cicilan bulanan maju setelah pembayaran menutup satu cicilan', () => {
    const loan = makeLoan({ principal: 3_000_000, installment: 1_000_000, firstDue: '2026-10-05', recurrence: { kind: 'monthly', count: 3 } })
    expect(nextDue(loan, [], TODAY)).toMatchObject({ index: 0, status: 'overdue', daysUntil: -16, amount: 1_000_000 })
    expect(nextDue(loan, [makePayment(loan.id, 1_000_000)], TODAY)).toMatchObject({ index: 1, date: '2026-11-05', status: 'due' })
  })

  it('bayar sebagian: sisa tagihan cicilan yang berjalan berkurang', () => {
    const loan = makeLoan({ principal: 3_000_000, installment: 1_000_000, firstDue: '2026-11-05', recurrence: { kind: 'monthly', count: 3 } })
    expect(nextDue(loan, [makePayment(loan.id, 400_000)], TODAY)).toMatchObject({ index: 0, amount: 600_000 })
  })

  it('tenor habis tapi belum lunas: cicilan terakhir menagih seluruh sisa', () => {
    const loan = makeLoan({ principal: 3_000_000, installment: 900_000, firstDue: '2026-08-05', recurrence: { kind: 'monthly', count: 3 } })
    const paid = [makePayment(loan.id, 900_000), makePayment(loan.id, 900_000)]
    expect(nextDue(loan, paid, TODAY)).toMatchObject({ index: 2, date: '2026-10-05', amount: 1_200_000, status: 'overdue' })
  })

  it('lunas berarti tidak ada jatuh tempo', () => {
    const loan = makeLoan({ principal: 1_000_000 })
    expect(nextDue(loan, [makePayment(loan.id, 1_000_000)], TODAY)).toBeNull()
  })

  it('denda bertambah menaikkan yang harus disiapkan, bukan pokok cicilan', () => {
    const loan = makeLoan({ principal: 2_000_000, installment: 500_000, firstDue: '2026-10-15', recurrence: { kind: 'monthly' } })
    const a = nextDue(loan, [], TODAY)!
    const b = nextDue({ ...loan, penaltyAccrued: 120_000 }, [], TODAY)!
    expect(b.amount).toBe(a.amount)
    expect(b.toPrepare).toBe(a.toPrepare + 120_000)
  })
})

describe('jadwal dalam rentang', () => {
  it('bulanan tanpa tenor berhenti saat sisa pokok tertutup, cicilan terakhir sisanya', () => {
    const loan = makeLoan({ principal: 2_500_000, installment: 1_000_000, firstDue: '2026-11-10', recurrence: { kind: 'monthly' } })
    const entries = scheduleInRange(loan, [], '2026-10-01', '2027-12-31', TODAY)
    expect(entries.map((e) => [e.date, e.amount, e.status])).toEqual([
      ['2026-11-10', 1_000_000, 'due'],
      ['2026-12-10', 1_000_000, 'upcoming'],
      ['2027-01-10', 500_000, 'upcoming'],
    ])
  })

  it('cicilan yang sudah tertutup tampil sebagai terbayar', () => {
    const loan = makeLoan({ principal: 3_000_000, installment: 1_000_000, firstDue: '2026-09-21', recurrence: { kind: 'monthly', count: 3 } })
    const entries = scheduleInRange(loan, [makePayment(loan.id, 1_000_000)], '2026-09-01', '2026-12-31', TODAY)
    expect(entries.map((e) => e.status)).toEqual(['paid', 'due', 'upcoming'])
  })

  it('hanya tanggal di dalam rentang', () => {
    const loan = makeLoan({ principal: 4_000_000, installment: 1_000_000, firstDue: '2026-10-25', recurrence: { kind: 'weekly' } })
    const entries = scheduleInRange(loan, [], '2026-11-01', '2026-11-30', TODAY)
    expect(entries.map((e) => e.date)).toEqual(['2026-11-01', '2026-11-08', '2026-11-15'])
  })

  it('pinjaman lunas tidak memunculkan jatuh tempo mendatang', () => {
    const loan = makeLoan({ principal: 2_000_000, installment: 1_000_000, firstDue: '2026-10-01', recurrence: { kind: 'monthly' } })
    const entries = scheduleInRange(loan, [makePayment(loan.id, 2_000_000)], '2026-10-01', '2027-06-30', TODAY)
    expect(entries).toHaveLength(2)
    expect(entries.every((e) => e.status === 'paid')).toBe(true)
  })
})

describe('kalender', () => {
  it('mengelompokkan per tanggal dengan total yang harus disiapkan', () => {
    const a = makeLoan({ id: 'a', principal: 600_000, firstDue: '2026-10-24' })
    const b = makeLoan({
      id: 'b',
      principal: 900_000,
      installment: 300_000,
      firstDue: '2026-10-24',
      recurrence: { kind: 'monthly' },
      penaltyAccrued: 25_000,
    })
    const c = makeLoan({ id: 'c', principal: 400_000, firstDue: '2026-11-02' })
    const days = calendarDays([a, b, c], [], '2026-10-01', '2026-10-31', TODAY)
    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('2026-10-24')
    expect(days[0].entries.map((e) => e.loanId)).toEqual(['a', 'b'])
    expect(days[0].totalToPrepare).toBe(600_000 + 300_000 + 25_000)
  })

  it('tidak menghitung yang sudah terbayar ke total', () => {
    const a = makeLoan({ id: 'a', principal: 2_000_000, installment: 1_000_000, firstDue: '2026-10-10', recurrence: { kind: 'monthly' } })
    const days = calendarDays([a], [makePayment('a', 1_000_000)], '2026-10-01', '2026-10-31', TODAY)
    expect(days[0].entries[0].status).toBe('paid')
    expect(days[0].totalToPrepare).toBe(0)
  })
})
