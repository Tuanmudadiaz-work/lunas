import { useState } from 'react'
import { Avatar, Badge, Button, Card, ListCard, ListRow, ProgressBar, ScreenHeader, Segmented, StatusText } from '../components'
import { ChevronRightIcon } from '../components/icons'
import { formatDateShort, formatDaysUntil, formatRupiah, loanProgress, nextDue, todayISO } from '../domain'
import type { LunasData } from '../app/data'
import type { Route } from '../app/route'
import type { OpenSheet } from '../app/sheets'

type Filter = 'all' | 'registered' | 'unregistered'

export function Utang({ data, navigate, openSheet }: { data: LunasData; navigate: (r: Route) => void; openSheet: OpenSheet }) {
  const [filter, setFilter] = useState<Filter>('all')
  const today = todayISO()
  const { payments, colorOf } = data

  const rows = data.loans
    .filter((l) => filter === 'all' || l.ojkStatus === filter)
    .map((loan) => ({ loan, progress: loanProgress(loan, payments), next: nextDue(loan, payments, today) }))
    // Yang belum lunas di atas, urut jatuh tempo; yang lunas di bawah.
    .sort((a, b) => Number(a.progress.isPaidOff) - Number(b.progress.isPaidOff) || (a.next?.date ?? '').localeCompare(b.next?.date ?? ''))

  return (
    <div className="space-y-block">
      <ScreenHeader title="Utang" />

      <Segmented<Filter>
        label="Filter status OJK"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Semua' },
          { value: 'registered', label: 'Terdaftar' },
          { value: 'unregistered', label: 'Belum terdaftar' },
        ]}
      />

      {data.loans.length === 0 ? (
        <Card className="space-y-3 text-center">
          <p className="text-[15px] text-muted">Belum ada pinjaman yang dicatat.</p>
          <Button block onClick={() => openSheet({ kind: 'loanForm' })}>
            Tambah pinjaman
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-center text-[15px] text-muted">Nggak ada pinjaman dengan status ini.</p>
        </Card>
      ) : (
        <ListCard>
          {rows.map(({ loan, progress, next }) => (
            <ListRow
              key={loan.id}
              onClick={() => openSheet({ kind: 'loanDetail', loanId: loan.id })}
              leading={<Avatar name={loan.name} colorIndex={colorOf(loan.id)} />}
              title={loan.name}
              subtitle={<StatusText status={loan.ojkStatus} />}
              trailing={progress.isPaidOff ? 'Lunas' : formatRupiah(progress.remainingPrincipal)}
              trailingSub={
                next ? (
                  <span className={next.daysUntil < 0 ? 'font-semibold text-warn' : ''}>
                    {next.daysUntil < 0 ? formatDaysUntil(next.daysUntil) : `Jatuh tempo ${formatDateShort(next.date)}`}
                  </span>
                ) : (
                  'Selesai'
                )
              }
              footer={
                <div className="space-y-1.5 pl-14">
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={progress.paidPercent} label={`${loan.name} lunas ${progress.paidPercent}%`} />
                    {progress.isPaidOff ? (
                      <Badge tone="ok">Lunas</Badge>
                    ) : progress.isNearlyPaid ? (
                      <span className="whitespace-nowrap text-[12px] font-bold text-link">Hampir lunas · {progress.paidPercent}%</span>
                    ) : (
                      <span className="whitespace-nowrap text-[12px] font-semibold text-muted">{progress.paidPercent}% lunas</span>
                    )}
                  </div>
                  {progress.penaltyOutstanding > 0 && (
                    <div className="text-[12px] font-medium text-warn">Denda tercatat {formatRupiah(progress.penaltyOutstanding)} (terpisah dari pokok)</div>
                  )}
                </div>
              }
            />
          ))}
        </ListCard>
      )}

      {data.loans.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('rencana')}
          className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-full border border-card-border bg-card px-5 text-[15px] font-semibold"
        >
          Lihat rencana bayar bulan ini
          <ChevronRightIcon width={20} height={20} className="text-muted" />
        </button>
      )}
    </div>
  )
}
