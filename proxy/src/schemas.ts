import * as z from 'zod/v4'

// Masukan dari HP. Semua dibatasi panjangnya supaya biaya dan penyalahgunaan terkendali.

const money = z.number().int().min(0).max(10_000_000_000)

export const LoanSnapshotSchema = z.object({
  alias: z.string().regex(/^Pinjaman [A-Z0-9]{1,3}$/),
  remaining: money,
  paidPercent: z.number().int().min(0).max(100),
  penalty: money,
  dailyCharge: money,
  daysUntilDue: z.number().int().min(-3650).max(3650),
  nextAmount: money,
  ojkRegistered: z.boolean(),
})

export const SnapshotSchema = z.object({
  loans: z.array(LoanSnapshotSchema).max(30),
  activeCount: z.number().int().min(0).max(100),
  paidOffCount: z.number().int().min(0).max(100),
  remainingTotal: money,
  penaltyTotal: money,
  paidPercent: z.number().int().min(0).max(100),
  dailyChargeTotal: money,
  monthlyAvailable: money.nullable(),
})

export const MoodSchema = z.enum(['berat', 'cemas', 'biasa', 'cukup', 'lega'])

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const ActivateBody = z.object({
  code: z.string().min(16).max(40),
  publicKey: z.string().min(80).max(120),
  challengeId: z.string().min(16).max(64),
  signature: z.string().min(80).max(100),
})

export const ResetBody = z.object({ code: z.string().min(16).max(40) })

export const ExtractBody = z.object({
  kind: z.enum(['loan', 'payment']),
  text: z.string().min(3).max(600),
  /** Tanggal hari ini di HP, untuk membaca 'tanggal 25' atau 'minggu depan'. */
  today: isoDate,
  /** Alias pinjaman yang ada, untuk isian pembayaran ('bayar Pinjaman B 500rb'). */
  aliases: z.array(z.string().regex(/^Pinjaman [A-Z0-9]{1,3}$/)).max(30).default([]),
})

export const ChatTurn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
})

export const SummaryBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('snapshot'), snapshot: SnapshotSchema }),
  z.object({ kind: z.literal('conversation'), messages: z.array(ChatTurn).min(1).max(40) }),
])

export const SuggestBody = z.object({
  snapshot: SnapshotSchema,
  mood: MoodSchema.nullable(),
})

export const ChatBody = z.object({
  snapshot: SnapshotSchema,
  memory: z.array(z.string().max(600)).max(5).default([]),
  /** Beberapa pesan terakhir saja; pesan terakhir harus dari pengguna. */
  messages: z
    .array(ChatTurn)
    .min(1)
    .max(8)
    .refine((m) => m[m.length - 1].role === 'user', 'Pesan terakhir harus dari pengguna.'),
})

// Keluaran Haiku. Selalu JSON dengan bentuk tetap; tidak ada percakapan bebas.

const nullableMoney = z.number().int().min(0).nullable()

export const LoanExtraction = z.object({
  principal: nullableMoney.describe('Pokok awal pinjaman dalam rupiah, bilangan bulat.'),
  remaining: nullableMoney.describe('Sisa pokok sekarang, jika disebut.'),
  repeat: z.enum(['once', 'monthly', 'weekly', 'everyNDays']).nullable(),
  everyDays: z.number().int().min(1).max(365).nullable(),
  installment: nullableMoney.describe('Nominal per cicilan, jika cicilan.'),
  count: z.number().int().min(1).max(120).nullable().describe('Sisa berapa kali cicilan.'),
  dueDate: isoDate.nullable().describe('Jatuh tempo berikutnya, format YYYY-MM-DD.'),
  dailyCharge: nullableMoney.describe('Bunga atau denda per hari dalam rupiah.'),
  penaltyAccrued: nullableMoney.describe('Denda yang sudah tercatat.'),
  ojkRegistered: z.boolean().nullable(),
  unclear: z.array(z.string()).describe('Bagian kalimat yang tidak yakin dibaca, dalam bahasa Indonesia singkat.'),
})

export const PaymentExtraction = z.object({
  loanAlias: z.string().nullable().describe('Salah satu alias yang diberikan, atau null.'),
  amount: nullableMoney,
  date: isoDate.nullable(),
  allocation: z.enum(['principal', 'penalty']).nullable(),
  unclear: z.array(z.string()),
})

export const SnapshotSummary = z.object({
  text: z.string().describe('Ringkasan 2 sampai 4 kalimat, netral, tanpa saran keputusan.'),
  highlights: z.array(z.string()).describe('Paling banyak 3 poin pendek.'),
})

export const ConversationNote = z.object({
  note: z.string().describe('Catatan memori singkat, paling banyak 3 kalimat.'),
})

const Card = z.object({
  title: z.string().describe('Paling banyak 8 kata.'),
  body: z.string().describe('Paling banyak 25 kata.'),
})

export const DailyCards = z.object({ tenang: Card, rencana: Card, hak: Card })
