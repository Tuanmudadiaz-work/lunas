import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { repo } from '../db/repo'
import { todayISO, type Loan, type Payment, type Settings } from '../domain'

export type LunasData = {
  loans: Loan[]
  payments: Payment[]
  settings: Settings
  /** Warna avatar per pinjaman, tetap menurut urutan pinjaman dibuat (A, B, C, ...). */
  colorOf: (loanId: string) => number
}

/** Semua data yang dipakai layar, diperbarui otomatis setiap kali IndexedDB berubah. */
export function useLunasData(): LunasData | undefined {
  return useLiveQuery(async () => {
    const [loans, payments, settings] = await Promise.all([repo.listLoans(), repo.listPayments(), repo.getSettings()])
    const order = new Map([...loans].sort((a, b) => a.createdAt - b.createdAt).map((l, i) => [l.id, i]))
    return { loans, payments, settings, colorOf: (id: string) => order.get(id) ?? 0 }
  })
}

export function useTodayFeeling() {
  return useLiveQuery(() => db.feelings.get(todayISO()))
}
