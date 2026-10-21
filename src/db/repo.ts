import {
  DEFAULT_SETTINGS,
  todayISO,
  validateLoan,
  validatePayment,
  type DailySuggestion,
  type Feeling,
  type ISODate,
  type Loan,
  type LoanInput,
  type MemoryNote,
  type Mood,
  type Payment,
  type PaymentInput,
  type Settings,
  type SuggestionCard,
} from '../domain'
import { db as defaultDb, type LunasDB, type SettingRow } from './db'

export class ValidationError extends Error {
  readonly errors: string[]
  constructor(errors: string[]) {
    super(errors.join(' '))
    this.name = 'ValidationError'
    this.errors = errors
  }
}

function assertValid(errors: string[]) {
  if (errors.length) throw new ValidationError(errors)
}

/** Catatan memori yang disimpan paling banyak sekian; yang terlama dibuang. */
export const MAX_MEMORY_NOTES = 20

export function makeRepo(db: LunasDB, now: () => number = Date.now) {
  return {
    // Pinjaman

    listLoans: () => db.loans.orderBy('firstDue').toArray(),

    getLoan: (id: string) => db.loans.get(id),

    async addLoan(input: LoanInput): Promise<Loan> {
      assertValid(validateLoan(input))
      const t = now()
      const loan: Loan = { ...input, name: input.name.trim(), id: crypto.randomUUID(), createdAt: t, updatedAt: t }
      await db.loans.add(loan)
      return loan
    },

    async updateLoan(id: string, patch: Partial<LoanInput>): Promise<Loan> {
      const current = await db.loans.get(id)
      if (!current) throw new ValidationError(['Pinjaman tidak ditemukan.'])
      const { id: _id, createdAt, updatedAt: _u, ...rest } = current
      const next = { ...rest, ...patch }
      assertValid(validateLoan(next))
      const loan: Loan = { ...next, id, createdAt, updatedAt: now() }
      await db.loans.put(loan)
      return loan
    },

    /** Menghapus pinjaman beserta semua pembayarannya. */
    async deleteLoan(id: string): Promise<void> {
      await db.transaction('rw', db.loans, db.payments, async () => {
        await db.payments.where('loanId').equals(id).delete()
        await db.loans.delete(id)
      })
    },

    // Pembayaran

    listPayments: () => db.payments.orderBy('date').toArray(),

    listPaymentsFor: (loanId: string) => db.payments.where('loanId').equals(loanId).sortBy('date'),

    async addPayment(input: PaymentInput): Promise<Payment> {
      assertValid(validatePayment(input))
      return db.transaction('rw', db.loans, db.payments, async () => {
        if (!(await db.loans.get(input.loanId))) throw new ValidationError(['Pinjaman tidak ditemukan.'])
        const payment: Payment = { ...input, id: crypto.randomUUID(), createdAt: now() }
        await db.payments.add(payment)
        return payment
      })
    },

    deletePayment: (id: string) => db.payments.delete(id),

    // Pengaturan

    async getSettings(): Promise<Settings> {
      const rows = await db.settings.toArray()
      return Object.assign({ ...DEFAULT_SETTINGS }, Object.fromEntries(rows.map((r) => [r.key, r.value])))
    },

    async updateSettings(patch: Partial<Settings>): Promise<void> {
      const rows = Object.entries(patch).map(([key, value]) => ({ key, value }) as SettingRow)
      await db.settings.bulkPut(rows)
    },

    // Perasaan

    async checkIn(mood: Mood, date: ISODate = todayISO()): Promise<Feeling> {
      const feeling: Feeling = { date, mood, createdAt: now() }
      await db.feelings.put(feeling)
      return feeling
    },

    latestFeeling: () => db.feelings.orderBy('date').last(),

    feelingsSince: (date: ISODate) => db.feelings.where('date').aboveOrEqual(date).toArray(),

    // Saran harian

    getSuggestion: (date: ISODate = todayISO()) => db.suggestions.get(date),

    async saveSuggestion(cards: SuggestionCard[], date: ISODate = todayISO()): Promise<DailySuggestion> {
      const suggestion: DailySuggestion = { date, cards, createdAt: now() }
      await db.suggestions.put(suggestion)
      return suggestion
    },

    // Catatan memori

    /** Terbaru lebih dulu. */
    listMemoryNotes: (limit = MAX_MEMORY_NOTES) => db.memoryNotes.orderBy('createdAt').reverse().limit(limit).toArray(),

    async addMemoryNote(text: string): Promise<MemoryNote> {
      const note: MemoryNote = { id: crypto.randomUUID(), text: text.trim(), createdAt: now() }
      await db.transaction('rw', db.memoryNotes, async () => {
        await db.memoryNotes.add(note)
        const extra = (await db.memoryNotes.count()) - MAX_MEMORY_NOTES
        if (extra > 0) await db.memoryNotes.orderBy('createdAt').limit(extra).delete()
      })
      return note
    },

    // Semua data

    /** Tombol 'Hapus semua data': mengosongkan semua tabel di perangkat. */
    async wipeAll(): Promise<void> {
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((t) => t.clear()))
      })
    },
  }
}

export type Repo = ReturnType<typeof makeRepo>

export const repo = makeRepo(defaultDb)
