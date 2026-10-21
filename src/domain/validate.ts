import { isISODate } from './date'
import type { Loan, Payment } from './types'

export type LoanInput = Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>
export type PaymentInput = Omit<Payment, 'id' | 'createdAt'>

const isMoney = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/** Daftar masalah isian pinjaman, kosong jika valid. Pesan siap ditampilkan di form. */
export function validateLoan(input: LoanInput): string[] {
  const errors: string[] = []
  if (!input.name.trim()) errors.push('Nama pinjaman wajib diisi.')
  if (!isMoney(input.principal) || input.principal <= 0) errors.push('Pokok awal harus lebih dari Rp0.')
  if (!isMoney(input.paidBeforeTracking)) errors.push('Yang sudah dibayar tidak boleh negatif.')
  else if (isMoney(input.principal) && input.paidBeforeTracking > input.principal)
    errors.push('Yang sudah dibayar tidak boleh lebih besar dari pokok awal.')
  if (!isMoney(input.dailyCharge)) errors.push('Bunga atau denda per hari tidak boleh negatif.')
  if (!isMoney(input.penaltyAccrued)) errors.push('Denda tercatat tidak boleh negatif.')
  if (input.installment !== undefined && (!isMoney(input.installment) || input.installment <= 0))
    errors.push('Cicilan per jatuh tempo harus lebih dari Rp0.')
  if (!isISODate(input.firstDue)) errors.push('Tanggal jatuh tempo tidak valid.')

  const r = input.recurrence
  if ('count' in r && r.count !== undefined && (!Number.isInteger(r.count) || r.count < 1))
    errors.push('Jumlah jatuh tempo minimal 1.')
  if (r.kind === 'everyNDays' && (!Number.isInteger(r.days) || r.days < 1)) errors.push('Jarak hari minimal 1.')
  return errors
}

export function validatePayment(input: PaymentInput): string[] {
  const errors: string[] = []
  if (!input.loanId) errors.push('Pilih pinjaman yang dibayar.')
  if (!isMoney(input.amount) || input.amount <= 0) errors.push('Nominal pembayaran harus lebih dari Rp0.')
  if (!isISODate(input.date)) errors.push('Tanggal pembayaran tidak valid.')
  if (input.allocation !== 'principal' && input.allocation !== 'penalty') errors.push('Jenis pembayaran tidak valid.')
  return errors
}
