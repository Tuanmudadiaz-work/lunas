import { Dexie, type EntityTable } from 'dexie'
import type { DailySuggestion, Feeling, Loan, MemoryNote, Payment, Settings } from '../domain'

/** Kunci perangkat untuk lisensi. `privateKey` adalah CryptoKey yang tidak bisa diekspor. */
export type DeviceRow = { id: 'main'; privateKey: CryptoKey; publicKey: string; createdAt: number }

export type SettingRow = { [K in keyof Settings]: { key: K; value: Settings[K] } }[keyof Settings]

/**
 * Semua data pengguna tinggal di IndexedDB perangkat. Tabel tidak menyimpan nama, NIK, nomor telepon,
 * atau alamat; nama platform pinjaman hanya disimpan lokal.
 */
export class LunasDB extends Dexie {
  loans!: EntityTable<Loan, 'id'>
  payments!: EntityTable<Payment, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  feelings!: EntityTable<Feeling, 'date'>
  suggestions!: EntityTable<DailySuggestion, 'date'>
  memoryNotes!: EntityTable<MemoryNote, 'id'>
  device!: EntityTable<DeviceRow, 'id'>

  constructor(name = 'lunas') {
    super(name)
    this.version(1).stores({
      loans: 'id, ojkStatus, firstDue, updatedAt',
      payments: 'id, loanId, date',
      settings: 'key',
      feelings: 'date',
      suggestions: 'date',
      memoryNotes: 'id, createdAt',
    })
    // Fase 3: kunci perangkat untuk ikatan lisensi.
    this.version(2).stores({ device: 'id' })
  }
}

export const db = new LunasDB()
