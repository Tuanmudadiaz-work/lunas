import { useState } from 'react'
import { Button, Card, IconButton, ListCard, MoneyField, ScreenHeader } from '../components'
import { ChevronLeftIcon } from '../components/icons'
import { repo } from '../db/repo'
import { buildPaymentPlan, formatRupiah, parseRupiah, todayISO } from '../domain'
import type { LunasData } from '../app/data'
import type { Route } from '../app/route'

const toField = (n: number) => (n ? formatRupiah(n).replace('Rp', '') : '')

export function Rencana({ data, back, navigate }: { data: LunasData; back: () => void; navigate: (r: Route) => void }) {
  const { settings } = data
  const needsBudget = settings.monthlyIncome === 0
  const [editing, setEditing] = useState(needsBudget)
  const [income, setIncome] = useState(toField(settings.monthlyIncome))
  const [needs, setNeeds] = useState(toField(settings.basicNeeds))
  const [error, setError] = useState('')

  const plan = buildPaymentPlan({
    loans: data.loans,
    payments: data.payments,
    monthlyIncome: settings.monthlyIncome,
    basicNeeds: settings.basicNeeds,
    today: todayISO(),
  })

  const saveBudget = async () => {
    const i = parseRupiah(income)
    const n = needs.trim() ? parseRupiah(needs) : 0
    if (i === null || i === 0) return setError('Isi pemasukan per bulan dulu. Contoh: 4.000.000 atau 4jt.')
    if (n === null) return setError('Kebutuhan dasar tidak terbaca. Contoh: 3.200.000 atau 3,2jt.')
    setError('')
    await repo.updateSettings({ monthlyIncome: i, basicNeeds: n })
    setEditing(false)
  }

  let rank = 0

  return (
    <div className="space-y-block">
      <ScreenHeader
        title="Rencana bayar"
        left={
          <IconButton aria-label="Kembali" onClick={back}>
            <ChevronLeftIcon width={20} height={20} />
          </IconButton>
        }
      />

      <Card className="space-y-1.5">
        <span className="text-[13px] font-medium text-muted">Sisa untuk cicilan bulan ini</span>
        {editing ? (
          <form
            className="space-y-3 pt-1"
            onSubmit={(e) => {
              e.preventDefault()
              void saveBudget()
            }}
          >
            <MoneyField label="Pemasukan per bulan" value={income} onChange={setIncome} placeholder="4.000.000" />
            <MoneyField
              label="Kebutuhan dasar per bulan"
              hint="Makan, sewa, transport, sekolah anak. Yang nggak bisa ditawar."
              value={needs}
              onChange={setNeeds}
              placeholder="3.200.000"
            />
            {error && (
              <p role="alert" className="text-[14px] text-warn">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" block>
                Hitung
              </Button>
              {!needsBudget && (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Batal
                </Button>
              )}
            </div>
            <p className="text-[12px] text-muted">Disimpan di HP, cuma dipakai untuk hitungan ini.</p>
          </form>
        ) : (
          <>
            <div className="text-[34px] leading-tight font-bold tracking-tight tabular-nums">{formatRupiah(plan.available)}</div>
            <p className="text-[13px] text-muted">
              Pemasukan {formatRupiah(settings.monthlyIncome)} dikurangi kebutuhan dasar {formatRupiah(settings.basicNeeds)}.{' '}
              <button type="button" onClick={() => setEditing(true)} className="font-semibold text-link underline-offset-2 hover:underline">
                Ubah
              </button>
            </p>
          </>
        )}
      </Card>

      {!editing && plan.items.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Urutan bayar</h2>
          <ListCard>
            {plan.items.map((item) => {
              const position = item.checkHelpFirst ? null : ++rank
              return (
                <div key={item.loan.id} className="flex min-h-[68px] items-center gap-3 px-4 py-2.5">
                  <span
                    aria-label={position ? `Urutan ${position}` : 'Tidak diurutkan'}
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                      position ? 'bg-primary text-on-primary' : 'border border-warn text-warn'
                    }`}
                  >
                    {position ?? '!'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold">{item.loan.name}</div>
                    <div className="text-[13px] leading-snug text-muted">{item.reason.text}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.checkHelpFirst ? (
                      <span className="block max-w-[76px] text-[12px] leading-tight font-semibold text-warn">Cek bantuan dulu</span>
                    ) : item.dueInPeriod === 0 ? (
                      <span className="text-[12px] text-muted">Belum bulan ini</span>
                    ) : (
                      <>
                        <div className="text-[15px] font-bold tabular-nums">{formatRupiah(item.allocation)}</div>
                        {item.allocation < item.dueInPeriod && (
                          <div className="text-[12px] text-muted">dari {formatRupiah(item.dueInPeriod)}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </ListCard>
          <p className="text-[13px] text-muted" aria-live="polite">
            {plan.shortfall > 0
              ? `Dana bulan ini kurang ${formatRupiah(plan.shortfall)} dari tagihan yang jatuh tempo. Wajar kalau ini terasa berat; angka ini bisa jadi bahan kalau lu mau mengajukan keringanan.`
              : plan.leftover > 0
                ? `Semua tagihan bulan ini tertutup, masih sisa ${formatRupiah(plan.leftover)}.`
                : 'Dana bulan ini pas untuk tagihan yang jatuh tempo.'}
          </p>
          <p className="text-[12px] text-muted">
            Urutan dihitung dari jatuh tempo, beban bunga atau denda per hari, dan status OJK. Pinjaman belum terdaftar OJK
            tidak diberi alokasi otomatis. Keputusan tetap di tangan lu.
          </p>
        </section>
      )}

      {!editing && plan.items.length === 0 && (
        <Card>
          <p className="text-center text-[15px] text-muted">Belum ada tagihan aktif untuk diatur.</p>
        </Card>
      )}

      <button type="button" onClick={() => navigate('tenang')} className="min-h-touch w-full text-center text-[14px] font-semibold text-link">
        Tanya Teman Tenang soal rencana ini
      </button>
    </div>
  )
}
