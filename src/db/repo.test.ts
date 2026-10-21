import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loanProgress, type LoanInput } from '../domain'
import { LunasDB } from './db'
import { MAX_MEMORY_NOTES, ValidationError, makeRepo, type Repo } from './repo'

const loanInput: LoanInput = {
  name: 'Pinjaman A',
  principal: 2_000_000,
  paidBeforeTracking: 0,
  dailyCharge: 10_000,
  penaltyAccrued: 0,
  firstDue: '2026-10-25',
  recurrence: { kind: 'once' },
  ojkStatus: 'registered',
}

let db: LunasDB
let repo: Repo
let clock: number

beforeEach(() => {
  db = new LunasDB(`test-${crypto.randomUUID()}`)
  clock = 1_000
  repo = makeRepo(db, () => clock++)
})

afterEach(async () => {
  await db.delete()
})

describe('pinjaman', () => {
  it('tambah, ubah, dan baca kembali', async () => {
    const added = await repo.addLoan({ ...loanInput, name: '  Pinjaman A  ' })
    expect(added.name).toBe('Pinjaman A')
    const updated = await repo.updateLoan(added.id, { penaltyAccrued: 40_000 })
    expect(updated.createdAt).toBe(added.createdAt)
    expect(updated.updatedAt).toBeGreaterThan(added.updatedAt)
    expect(await repo.getLoan(added.id)).toEqual(updated)
  })

  it('menolak isian tidak valid tanpa menyimpan apa pun', async () => {
    await expect(repo.addLoan({ ...loanInput, principal: 0 })).rejects.toBeInstanceOf(ValidationError)
    expect(await repo.listLoans()).toEqual([])
  })

  it('menolak ubahan yang membuat data tidak valid', async () => {
    const added = await repo.addLoan(loanInput)
    await expect(repo.updateLoan(added.id, { paidBeforeTracking: 5_000_000 })).rejects.toBeInstanceOf(ValidationError)
    expect((await repo.getLoan(added.id))?.paidBeforeTracking).toBe(0)
  })

  it('hapus pinjaman ikut menghapus pembayarannya saja', async () => {
    const a = await repo.addLoan(loanInput)
    const b = await repo.addLoan({ ...loanInput, name: 'Pinjaman B' })
    await repo.addPayment({ loanId: a.id, amount: 100_000, date: '2026-10-21', allocation: 'principal' })
    await repo.addPayment({ loanId: b.id, amount: 200_000, date: '2026-10-21', allocation: 'principal' })
    await repo.deleteLoan(a.id)
    expect((await repo.listLoans()).map((l) => l.id)).toEqual([b.id])
    expect((await repo.listPayments()).map((p) => p.loanId)).toEqual([b.id])
  })
})

describe('pembayaran', () => {
  it('tercatat dan menaikkan persentase lunas', async () => {
    const loan = await repo.addLoan(loanInput)
    await repo.addPayment({ loanId: loan.id, amount: 500_000, date: '2026-10-21', allocation: 'principal' })
    await repo.addPayment({ loanId: loan.id, amount: 20_000, date: '2026-10-22', allocation: 'penalty' })
    const payments = await repo.listPaymentsFor(loan.id)
    expect(payments).toHaveLength(2)
    expect(loanProgress(loan, payments).paidPercent).toBe(25)
  })

  it('menolak pembayaran untuk pinjaman yang tidak ada', async () => {
    await expect(
      repo.addPayment({ loanId: 'tidak-ada', amount: 100_000, date: '2026-10-21', allocation: 'principal' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('pengaturan', () => {
  it('memakai nilai bawaan lalu menyimpan perubahan sebagian', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS)
    await repo.updateSettings({ themePref: 'dark', monthlyIncome: 4_000_000 })
    expect(await repo.getSettings()).toEqual({ ...DEFAULT_SETTINGS, themePref: 'dark', monthlyIncome: 4_000_000 })
  })
})

describe('perasaan, saran, dan memori', () => {
  it('check-in ulang di hari yang sama menimpa yang lama', async () => {
    await repo.checkIn('cemas', '2026-10-20')
    await repo.checkIn('berat', '2026-10-21')
    await repo.checkIn('lega', '2026-10-21')
    expect((await repo.latestFeeling())?.mood).toBe('lega')
    expect(await repo.feelingsSince('2026-10-21')).toHaveLength(1)
  })

  it('saran harian satu set per tanggal', async () => {
    const cards = [{ category: 'tenang' as const, title: 'Tarik napas', body: 'Satu langkah dulu.' }]
    await repo.saveSuggestion(cards, '2026-10-21')
    expect((await repo.getSuggestion('2026-10-21'))?.cards).toEqual(cards)
    expect(await repo.getSuggestion('2026-10-22')).toBeUndefined()
  })

  it('catatan memori dibatasi dan yang terlama dibuang', async () => {
    for (let i = 0; i < MAX_MEMORY_NOTES + 3; i++) await repo.addMemoryNote(`catatan ${i}`)
    const notes = await repo.listMemoryNotes()
    expect(notes).toHaveLength(MAX_MEMORY_NOTES)
    expect(notes[0].text).toBe(`catatan ${MAX_MEMORY_NOTES + 2}`)
    expect(notes.at(-1)?.text).toBe('catatan 3')
  })
})

describe('hapus semua data', () => {
  it('mengosongkan semua tabel', async () => {
    const loan = await repo.addLoan(loanInput)
    await repo.addPayment({ loanId: loan.id, amount: 1, date: '2026-10-21', allocation: 'principal' })
    await repo.updateSettings({ themePref: 'dark' })
    await repo.checkIn('biasa')
    await repo.addMemoryNote('x')
    await repo.wipeAll()
    for (const table of db.tables) expect(await table.count()).toBe(0)
  })
})
