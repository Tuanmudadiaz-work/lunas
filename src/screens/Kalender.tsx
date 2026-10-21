import { useState } from 'react'
import { Avatar, Button, Card, ScreenHeader, StatusText } from '../components'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import {
  calendarDays,
  daysInMonth,
  firstWeekdayOfMonth,
  formatDateLong,
  formatMonth,
  formatRupiah,
  parseISODate,
  todayISO,
  toISODate,
  WEEKDAYS_SHORT,
  type ISODate,
} from '../domain'
import type { LunasData } from '../app/data'
import type { OpenSheet } from '../app/sheets'

const STATUS_LABEL = { paid: 'Sudah terbayar', overdue: 'Lewat jatuh tempo', due: '', upcoming: '' } as const

export function Kalender({ data, openSheet }: { data: LunasData; openSheet: OpenSheet }) {
  const today = todayISO()
  const t = parseISODate(today)
  const [month, setMonth] = useState({ y: t.y, m: t.m })
  const [selected, setSelected] = useState<ISODate>(today)

  const from = toISODate(month.y, month.m, 1)
  const to = toISODate(month.y, month.m, daysInMonth(month.y, month.m))
  const days = calendarDays(data.loans, data.payments, from, to, today)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const loanById = new Map(data.loans.map((l) => [l.id, l]))

  const shift = (delta: number) => {
    const index = month.y * 12 + (month.m - 1) + delta
    const next = { y: Math.floor(index / 12), m: (index % 12) + 1 }
    setMonth(next)
    const isThisMonth = next.y === t.y && next.m === t.m
    setSelected(isThisMonth ? today : toISODate(next.y, next.m, 1))
  }

  const blanks = firstWeekdayOfMonth(month.y, month.m)
  const selectedDay = byDate.get(selected)
  const unpaid = selectedDay?.entries.filter((e) => e.status !== 'paid') ?? []

  return (
    <div className="space-y-block">
      <ScreenHeader title="Kalender" />

      <Card className="space-y-1.5 px-3 pt-3 pb-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() => shift(-1)}
            className="flex size-touch items-center justify-center rounded-full bg-track/60"
          >
            <ChevronLeftIcon width={20} height={20} />
          </button>
          <h2 className="text-[17px] font-bold" aria-live="polite">
            {formatMonth(month.y, month.m)}
          </h2>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            onClick={() => shift(1)}
            className="flex size-touch items-center justify-center rounded-full bg-track/60"
          >
            <ChevronRightIcon width={20} height={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-muted" aria-hidden>
          {WEEKDAYS_SHORT.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: blanks }, (_, i) => (
            <div key={`b${i}`} className="h-11" />
          ))}
          {Array.from({ length: daysInMonth(month.y, month.m) }, (_, i) => {
            const date = toISODate(month.y, month.m, i + 1)
            const day = byDate.get(date)
            const hasUnpaid = day?.entries.some((e) => e.status !== 'paid')
            const isSel = date === selected
            const isToday = date === today
            const label = `${formatDateLong(date)}${day ? (hasUnpaid ? ', ada jatuh tempo' : ', sudah terbayar') : ''}${isToday ? ', hari ini' : ''}`
            return (
              <button
                key={date}
                type="button"
                aria-label={label}
                aria-pressed={isSel}
                onClick={() => setSelected(date)}
                className={`flex h-11 flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] text-[15px] leading-none ${
                  isSel
                    ? 'border-accent bg-accent font-bold text-on-accent'
                    : `${isToday ? 'border-link' : 'border-transparent'} ${day ? 'font-bold' : 'font-medium'}`
                }`}
              >
                {i + 1}
                {day && (
                  <span
                    aria-hidden
                    className={`size-[5px] rounded-full ${isSel ? 'bg-on-accent' : hasUnpaid ? 'bg-warn' : 'bg-ok'}`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[18px] font-bold">{formatDateLong(selected)}</h2>
        {selectedDay ? (
          <>
            <ul className="space-y-2.5">
              {selectedDay.entries.map((entry) => {
                const loan = loanById.get(entry.loanId)!
                return (
                  <li key={`${entry.loanId}-${entry.index}`} className="flex items-center gap-3">
                    <Avatar name={loan.name} colorIndex={data.colorOf(loan.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold">{loan.name}</div>
                      {STATUS_LABEL[entry.status] ? (
                        <span className={`text-[13px] font-medium ${entry.status === 'paid' ? 'text-ok' : 'text-warn'}`}>
                          {STATUS_LABEL[entry.status]}
                        </span>
                      ) : (
                        <StatusText status={loan.ojkStatus} />
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-base font-bold tabular-nums ${entry.status === 'paid' ? 'text-muted line-through' : ''}`}>
                        {formatRupiah(entry.status === 'paid' ? entry.amount : entry.toPrepare)}
                      </div>
                      {entry.penalty > 0 && <div className="text-[12px] text-muted">termasuk denda {formatRupiah(entry.penalty)}</div>}
                    </div>
                  </li>
                )
              })}
            </ul>
            {unpaid.length > 0 && (
              <>
                <div className="flex items-baseline justify-between border-t border-card-border pt-3">
                  <span className="text-[14px] text-muted">Total yang harus disiapkan</span>
                  <span className="text-[20px] font-bold tabular-nums">{formatRupiah(selectedDay.totalToPrepare)}</span>
                </div>
                <Button block onClick={() => openSheet({ kind: 'payment', loanId: unpaid[0].loanId })}>
                  Catat pembayaran
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3.5">
            <div className="flex size-[88px] shrink-0 items-center justify-center rounded-box bg-track/60">
              <PlantIllustration />
            </div>
            <p className="text-[15px] leading-relaxed text-muted">Nggak ada tagihan di tanggal ini. Lu aman hari ini.</p>
          </div>
        )}
      </Card>
    </div>
  )
}

/** Ilustrasi tanaman datar untuk keadaan kosong. Warna dari palet, tanpa gradasi. */
function PlantIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <path d="M20 44h24l-3 14H23z" fill="var(--loan-c)" />
      <rect x="18" y="40" width="28" height="6" rx="2" fill="var(--loan-a)" />
      <path d="M32 40V22" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 30c-9 0-13-6-13-12 7 0 13 4 13 12z" fill="var(--loan-e)" />
      <path d="M32 26c0-9 5-14 13-14 0 8-5 14-13 14z" fill="var(--loan-b)" />
    </svg>
  )
}
