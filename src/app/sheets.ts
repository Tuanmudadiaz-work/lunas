import type { ISODate } from '../domain'

/** Lembar yang sedang terbuka. Hanya satu sekaligus. */
export type SheetState =
  | { kind: 'tambah' }
  | { kind: 'loanForm'; loanId?: string }
  | { kind: 'payment'; loanId?: string; date?: ISODate }
  | { kind: 'loanDetail'; loanId: string }

export type OpenSheet = (sheet: SheetState) => void
