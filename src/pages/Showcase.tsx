import { useState } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DonutLegend,
  IconButton,
  ListCard,
  ListRow,
  PillNav,
  ProgressBar,
  Segmented,
  SemiDonut,
  StatusText,
  type TabKey,
} from '../components'
import { ChevronRightIcon, MoonIcon, SunIcon } from '../components/icons'
import { sampleLoans, samplePaidText, sampleTotalText } from '../demo/sampleLoans'
import { useTheme, type Theme, type ThemePref } from '../theme/useTheme'

type View = 'both' | 'single'

export default function Showcase() {
  const { pref, theme, setPref } = useTheme()
  const [view, setView] = useState<View>('both')

  return (
    <div className="min-h-dvh px-page py-6">
      <header className="mx-auto mb-6 max-w-[820px]">
        <p className="text-[13px] font-medium text-link">Fase 0 · Fondasi</p>
        <h1 className="mt-1 text-[22px] font-bold">Komponen dasar Lunas</h1>
        <p className="mt-1 text-[15px] text-muted">
          Semua komponen dari token desain PRD, tampil di mode terang dan gelap.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Segmented<View>
            label="Tampilan"
            value={view}
            onChange={setView}
            options={[
              { value: 'both', label: 'Berdampingan' },
              { value: 'single', label: 'Satu tema' },
            ]}
          />
          {view === 'single' && (
            <Segmented<ThemePref>
              label="Tema"
              value={pref}
              onChange={setPref}
              options={[
                { value: 'system', label: 'Ikut HP' },
                { value: 'light', label: 'Terang' },
                { value: 'dark', label: 'Gelap' },
              ]}
            />
          )}
        </div>
      </header>

      {view === 'both' ? (
        <div className="mx-auto flex max-w-[820px] flex-wrap justify-center gap-6">
          <Frame theme="light" />
          <Frame theme="dark" />
        </div>
      ) : (
        <div className="mx-auto max-w-[390px]">
          <Gallery theme={theme} onToggleTheme={() => setPref(theme === 'dark' ? 'light' : 'dark')} />
        </div>
      )}
    </div>
  )
}

function Frame({ theme }: { theme: Theme }) {
  return (
    <div
      data-theme={theme}
      className="w-full max-w-[390px] rounded-[32px] border border-card-border px-page py-6 shadow-soft"
    >
      <p className="mb-4 text-center text-[13px] font-semibold text-muted">
        {theme === 'light' ? 'Mode terang' : 'Mode gelap'}
      </p>
      <Gallery theme={theme} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

const SWATCHES = [
  ['Latar', '--bg'],
  ['Kartu', '--card'],
  ['Teks', '--text'],
  ['Pendukung', '--text-muted'],
  ['Utama', '--primary'],
  ['Aksen', '--accent'],
  ['Terdaftar', '--ok'],
  ['Perhatian', '--warn'],
] as const

function Gallery({ theme, onToggleTheme }: { theme: Theme; onToggleTheme?: () => void }) {
  const [filter, setFilter] = useState<'all' | 'reg' | 'unreg'>('all')
  const [tab, setTab] = useState<TabKey>('beranda')
  const [added, setAdded] = useState(0)

  const loans = sampleLoans
    .map((l, i) => ({ ...l, colorIndex: i }))
    .filter((l) => filter === 'all' || (filter === 'reg') === (l.status === 'registered'))

  return (
    <div className="space-y-6">
      <Section title="Warna">
        <div className="grid grid-cols-4 gap-2">
          {SWATCHES.map(([label, v]) => (
            <div key={v} className="text-center">
              <div className="h-10 rounded-box border border-card-border" style={{ background: `var(${v})` }} />
              <div className="mt-1 text-[11px] text-muted">{label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {sampleLoans.map((l, i) => (
            <Avatar key={l.name} name={l.alias} colorIndex={i} size={36} />
          ))}
        </div>
      </Section>

      <Section title="Tipografi">
        <Card className="space-y-1">
          <div className="text-center text-[18px] font-semibold">Judul layar 18</div>
          <div className="text-base font-semibold">Judul seksi 16</div>
          <div className="text-[15px]">Isi 15. Pelan-pelan aja, satu langkah hari ini udah cukup.</div>
          <div className="text-[13px] text-muted">Keterangan 13 · Data utang lu tetap di HP</div>
          <a href="#" className="text-[15px] font-medium text-link">
            Teks biru untuk tautan
          </a>
        </Card>
      </Section>

      <Section title="Tombol">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Catat pembayaran</Button>
          <Button variant="accent">Aksen</Button>
          <Button variant="ghost">Nanti dulu</Button>
          {onToggleTheme ? (
            <IconButton aria-label="Ganti tema" onClick={onToggleTheme}>
              {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
            </IconButton>
          ) : (
            <IconButton aria-label="Tombol tema (contoh)">
              {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
            </IconButton>
          )}
        </div>
      </Section>

      <Section title="Kartu dan grafik setengah lingkaran">
        <Card>
          <CardHeader title="Sisa utang" action={<Badge>{samplePaidText}</Badge>} />
          <SemiDonut
            caption="Total sisa"
            total={sampleTotalText}
            ariaLabel={`Sisa utang ${sampleTotalText} dari ${sampleLoans.length} pinjaman`}
            segments={sampleLoans.map((l, i) => ({ label: l.name, value: l.remaining, colorIndex: i }))}
          />
          <DonutLegend
            segments={sampleLoans.map((l, i) => ({ label: l.name, value: l.remaining, colorIndex: i }))}
            format={(n) => sampleLoans.find((l) => l.remaining === n)?.remainingText ?? ''}
          />
        </Card>
        <Card>
          <CardHeader title="Prioritas hari ini" />
          <p className="text-[15px]">Siapkan cicilan Pinjaman A sebelum 24 Okt.</p>
          <p className="mt-1 text-[13px] text-muted">Jatuh tempo paling dekat dan dendanya paling besar per hari.</p>
          <Button block className="mt-3">
            Lihat rencana bayar
          </Button>
        </Card>
      </Section>

      <Section title="Avatar, teks status, badge">
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name="A" colorIndex={0} />
            <Avatar name="B" colorIndex={1} />
            <Avatar name="C" colorIndex={2} />
            <Avatar name="D" colorIndex={3} />
            <Avatar name="E" colorIndex={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <StatusText status="registered" />
            <StatusText status="unregistered" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>42% terbayar</Badge>
            <Badge tone="accent">Hampir lunas</Badge>
            <Badge tone="ok">Lunas</Badge>
            <Badge tone="warn">Cek bantuan dulu</Badge>
          </div>
        </Card>
      </Section>

      <Section title="Segmen dan baris daftar">
        <Segmented
          label="Filter status OJK"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Semua' },
            { value: 'reg', label: 'Terdaftar' },
            { value: 'unreg', label: 'Belum terdaftar' },
          ]}
        />
        <ListCard>
          {loans.map((l) => (
            <ListRow
              key={l.name}
              leading={<Avatar name={l.alias} colorIndex={l.colorIndex} />}
              title={l.name}
              subtitle={<StatusText status={l.status} />}
              trailing={l.remainingText}
              trailingSub={`Tempo ${l.due}`}
              footer={
                <div className="flex items-center gap-3">
                  <ProgressBar value={l.paidPct} label={`${l.name} lunas ${l.paidPct}%`} />
                  <span className="w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums text-link">
                    {l.paidPct}%
                  </span>
                  {l.paidPct >= 80 && <Badge tone="accent">Hampir lunas</Badge>}
                </div>
              }
            />
          ))}
          <ListRow
            title={<span className="text-link">Lihat rencana bayar</span>}
            trailing={<ChevronRightIcon width={20} height={20} className="text-link" />}
            onClick={() => {}}
          />
        </ListCard>
      </Section>

      <Section title="Menu pil">
        <PillNav fixed={false} active={tab} onChange={setTab} onAdd={() => setAdded((n) => n + 1)} />
        <p className="text-center text-[13px] text-muted" aria-live="polite">
          Tab aktif: {tab}
          {added > 0 && ` · tombol + ditekan ${added}x`}
        </p>
      </Section>
    </div>
  )
}
