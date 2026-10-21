import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Avatar, Button, Card, IconButton, ListCard, ListRow, ScreenHeader, SemiDonut, StatusText } from '../components'
import { ChevronRightIcon, MoonIcon, SunIcon } from '../components/icons'
import { db } from '../db/db'
import { repo } from '../db/repo'
import {
  formatDateShort,
  formatDaysUntil,
  formatRupiah,
  loanProgress,
  MOODS,
  portfolioSummary,
  rankLoans,
  todayISO,
  type Mood,
} from '../domain'
import type { LunasData } from '../app/data'
import type { Route } from '../app/route'
import type { OpenSheet } from '../app/sheets'

const MOOD_LABEL: Record<Mood, string> = { berat: 'Berat', cemas: 'Cemas', biasa: 'Biasa', cukup: 'Cukup', lega: 'Lega' }

/** Tanggapan tetap (bukan AI) setelah check-in. Validasi dulu, tanpa angka. */
const MOOD_REPLY: Record<Mood, string> = {
  berat: 'Makasih udah jujur. Hari berat nggak harus diselesaikan sekaligus.',
  cemas: 'Wajar banget cemas. Satu langkah kecil hari ini udah cukup.',
  biasa: 'Oke, tercatat. Pelan-pelan aja.',
  cukup: 'Syukurlah. Pertahankan ritme lu.',
  lega: 'Senang dengarnya. Lu udah berusaha.',
}

type Props = {
  data: LunasData
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  navigate: (route: Route) => void
  openSheet: OpenSheet
}

export function Beranda({ data, theme, onToggleTheme, navigate, openSheet }: Props) {
  const today = todayISO()
  const { loans, payments, colorOf } = data
  const summary = portfolioSummary(loans, payments)
  const ranked = rankLoans(loans, payments, today)
  const top = ranked[0]
  const nearest = [...ranked].sort((a, b) => a.next.daysUntil - b.next.daysUntil).slice(0, 2)

  const themeButton = (
    <IconButton aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'} onClick={onToggleTheme}>
      {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
    </IconButton>
  )

  return (
    <div className="space-y-block">
      <ScreenHeader title="Beranda" right={themeButton} />

      {loans.length === 0 ? (
        <Card className="space-y-3 text-center">
          <h2 className="text-base font-semibold">Mulai dari satu pinjaman dulu</h2>
          <p className="text-[15px] text-muted">
            Catat pinjaman satu per satu. Nanti sisa utang, kalender, dan urutan bayar muncul di sini.
          </p>
          <Button block onClick={() => openSheet({ kind: 'loanForm' })}>
            Tambah pinjaman
          </Button>
          <p className="text-[13px] text-muted">Data utang lu tetap di HP.</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-muted">Sisa utang per pinjaman</span>
              <span className="rounded-full bg-ok/15 px-2.5 py-1 text-[12px] font-semibold text-ok">
                {summary.paidPercent}% sudah terbayar
              </span>
            </div>
            {summary.remainingPrincipal > 0 ? (
              <SemiDonut
                caption="Total sisa pokok"
                total={formatRupiah(summary.remainingPrincipal)}
                ariaLabel={`Sisa pokok ${formatRupiah(summary.remainingPrincipal)} dari ${summary.activeCount} pinjaman aktif`}
                segments={loans.map((loan) => ({
                  label: loan.name,
                  value: loanProgress(loan, payments).remainingPrincipal,
                  colorIndex: colorOf(loan.id),
                }))}
              />
            ) : (
              <p className="py-6 text-center text-[18px] font-semibold">Semua pinjaman lunas. Keren banget.</p>
            )}
            {summary.penaltyOutstanding > 0 && (
              <p className="mt-2 text-center text-[13px] text-muted">
                Ditambah denda tercatat <span className="font-semibold text-warn">{formatRupiah(summary.penaltyOutstanding)}</span>
              </p>
            )}
          </Card>

          {top && (
            <button
              type="button"
              onClick={() => navigate('rencana')}
              className="flex min-h-[72px] w-full items-center justify-between gap-3 rounded-card border border-card-border bg-card px-4 py-3 text-left"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-[12px] font-semibold text-warn">Prioritas hari ini</div>
                <div className="text-base font-semibold">
                  {top.checkHelpFirst
                    ? `${top.loan.name}: cek bantuan dulu`
                    : `Siapkan ${formatRupiah(top.next.toPrepare)} untuk ${top.loan.name}`}
                </div>
                <div className="text-[13px] text-muted">
                  {top.reason.text}
                  {!top.checkHelpFirst && top.next.daysUntil >= 0 && ` · ${formatDateShort(top.next.date)}`}
                </div>
              </div>
              <ChevronRightIcon width={20} height={20} className="shrink-0 text-muted" />
            </button>
          )}

          {nearest.length > 0 && (
            <section className="space-y-2">
              <div className="flex min-h-6 items-center justify-between">
                <h2 className="text-base font-semibold">Jatuh tempo terdekat</h2>
                <button type="button" onClick={() => navigate('kalender')} className="min-h-touch text-[13px] font-semibold text-link">
                  Lihat kalender
                </button>
              </div>
              <ListCard>
                {nearest.map((item) => (
                  <ListRow
                    key={item.loan.id}
                    onClick={() => openSheet({ kind: 'loanDetail', loanId: item.loan.id })}
                    leading={<Avatar name={item.loan.name} colorIndex={colorOf(item.loan.id)} />}
                    title={item.loan.name}
                    subtitle={<StatusText status={item.loan.ojkStatus} />}
                    trailing={formatRupiah(item.next.toPrepare)}
                    trailingSub={
                      <span className={item.next.daysUntil < 0 ? 'font-semibold text-warn' : ''}>
                        {item.next.daysUntil < 0 ? formatDaysUntil(item.next.daysUntil) : formatDateShort(item.next.date)}
                      </span>
                    }
                  />
                ))}
              </ListCard>
            </section>
          )}
        </>
      )}

      <MoodCheckIn />
    </div>
  )
}

function MoodCheckIn() {
  const today = todayISO()
  const feeling = useLiveQuery(() => db.feelings.get(today), [today])
  const [saving, setSaving] = useState(false)
  const current = feeling?.mood

  const pick = async (mood: Mood) => {
    setSaving(true)
    try {
      await repo.checkIn(mood, today)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Perasaan lu hari ini</h2>
      <div className="flex gap-2" role="group" aria-label="Check-in perasaan hari ini">
        {MOODS.map((m) => {
          const on = m === current
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              disabled={saving}
              onClick={() => pick(m)}
              className={`min-h-touch min-w-0 flex-1 rounded-full border text-[13px] font-semibold transition-colors ${
                on ? 'border-transparent bg-accent text-on-accent' : 'border-card-border bg-card text-text'
              }`}
            >
              {MOOD_LABEL[m]}
            </button>
          )
        })}
      </div>
      <p className="min-h-5 text-[13px] text-muted" aria-live="polite">
        {current ? MOOD_REPLY[current] : 'Nggak ada jawaban salah. Pilih yang paling dekat.'}
      </p>
    </section>
  )
}
