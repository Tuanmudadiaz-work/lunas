/** Lima warna pinjaman (A sampai E) dari token desain. Indeks di luar 0..4 berputar ulang. */
export const LOAN_KEYS = ['a', 'b', 'c', 'd', 'e'] as const

export function loanColor(index: number) {
  const k = LOAN_KEYS[((index % 5) + 5) % 5]
  return { bg: `var(--loan-${k})`, fg: `var(--on-loan-${k})` }
}
