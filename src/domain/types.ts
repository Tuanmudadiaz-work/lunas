import type { ISODate } from './date'

export type OjkStatus = 'registered' | 'unregistered'

/**
 * Aturan pengulangan jatuh tempo, dihitung dari `firstDue`.
 * `count` adalah jumlah jatuh tempo yang tersisa sejak pinjaman didata (termasuk `firstDue`).
 * Tanpa `count`, jadwal berhenti saat pokok lunas.
 */
export type Recurrence =
  | { kind: 'once' }
  | { kind: 'monthly'; count?: number }
  | { kind: 'weekly'; count?: number }
  | { kind: 'everyNDays'; days: number; count?: number }

export type Loan = {
  id: string
  /** Nama platform. Hanya disimpan di perangkat, tidak pernah dikirim ke AI. */
  name: string
  /** Pokok awal, dalam rupiah. Penyebut persentase lunas. */
  principal: number
  /** Yang sudah dibayar sebelum pinjaman didata di aplikasi (pokok awal dikurangi sisa pokok saat didata). */
  paidBeforeTracking: number
  /** Bunga atau denda per hari, dalam rupiah. Dipakai untuk prioritas dan beban harian. */
  dailyCharge: number
  /** Denda yang sudah tercatat (diperbarui pengguna). Ditampilkan terpisah, tidak memengaruhi persentase. */
  penaltyAccrued: number
  /** Nominal yang ditagih per jatuh tempo. Kosong berarti seluruh sisa ditagih sekaligus. */
  installment?: number
  /** Jatuh tempo pertama sejak pinjaman didata. */
  firstDue: ISODate
  recurrence: Recurrence
  ojkStatus: OjkStatus
  createdAt: number
  updatedAt: number
}

/** 'principal' mengurangi pokok dan menaikkan persentase lunas; 'penalty' hanya mengurangi denda. */
export type PaymentAllocation = 'principal' | 'penalty'

export type Payment = {
  id: string
  loanId: string
  amount: number
  date: ISODate
  allocation: PaymentAllocation
  note?: string
  createdAt: number
}

export type Mood = 'berat' | 'cemas' | 'biasa' | 'cukup' | 'lega'

export const MOODS: Mood[] = ['berat', 'cemas', 'biasa', 'cukup', 'lega']

/** Satu check-in per hari; check-in ulang di hari yang sama menimpa yang lama. */
export type Feeling = {
  date: ISODate
  mood: Mood
  createdAt: number
}

export type SuggestionCategory = 'tenang' | 'rencana' | 'hak'

export type SuggestionCard = {
  category: SuggestionCategory
  title: string
  body: string
}

/** Saran harian dari Haiku, satu set per hari. */
export type DailySuggestion = {
  date: ISODate
  cards: SuggestionCard[]
  createdAt: number
}

/** Ringkasan satu sesi Teman Tenang, dipakai sebagai konteks pengganti riwayat lengkap. */
export type MemoryNote = {
  id: string
  text: string
  createdAt: number
}

export type ThemePref = 'system' | 'light' | 'dark'

export type Settings = {
  themePref: ThemePref
  /** Pemasukan per bulan, untuk Rencana bayar. */
  monthlyIncome: number
  /** Kebutuhan dasar per bulan, untuk Rencana bayar. */
  basicNeeds: number
  /** Mode hemat: tanpa blur dan animasi berat. */
  lowPowerMode: boolean
  /** Kode lisensi yang dimasukkan saat onboarding, dalam bentuk 'XXXX-XXXX-XXXX-XXXX'. Kosong jika belum. */
  licenseCode: string
  /** Kapan onboarding selesai (ms). 0 berarti belum. */
  onboardedAt: number
  /** Token akses proxy berumur pendek. Bukan rahasia jangka panjang: tanpa kunci perangkat, token ini tidak berguna. */
  licenseToken: string
  licenseTokenExpiresAt: number
}

export const DEFAULT_SETTINGS: Settings = {
  themePref: 'system',
  monthlyIncome: 0,
  basicNeeds: 0,
  lowPowerMode: false,
  licenseCode: '',
  onboardedAt: 0,
  licenseToken: '',
  licenseTokenExpiresAt: 0,
}
