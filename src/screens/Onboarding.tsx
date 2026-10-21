import { useState } from 'react'
import { Button, Card, TextField } from '../components'
import { CheckCircleBigIcon, ShieldIcon, TrendIcon } from '../components/icons'
import { repo } from '../db/repo'
import { normalizeLicenseCode } from '../domain'

const POINTS = [
  { Icon: ShieldIcon, title: 'Data utang lu tetap di HP', body: 'Nggak ada akun, nggak ada nama atau NIK yang diminta.' },
  { Icon: TrendIcon, title: 'Urutan bayar yang jelas', body: 'Dihitung dari jatuh tempo, denda per hari, dan status OJK.' },
  { Icon: CheckCircleBigIcon, title: 'Kemajuan yang kelihatan', body: 'Setiap pembayaran menaikkan persentase lunas.' },
]

/**
 * Onboarding dua langkah. Kode lisensi saat ini hanya diperiksa formatnya di perangkat;
 * aktivasi ke server dan ikatan satu perangkat menyusul di Fase 3.
 */
export function Onboarding() {
  const [step, setStep] = useState<'welcome' | 'license'>('welcome')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const activate = async () => {
    const normalized = normalizeLicenseCode(code)
    if (!normalized) {
      setError('Kodenya belum pas. Cek lagi 16 huruf dan angkanya, ya.')
      return
    }
    setSaving(true)
    await repo.updateSettings({ licenseCode: normalized, onboardedAt: Date.now() })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center gap-6 px-page py-10">
      {step === 'welcome' ? (
        <>
          <div className="space-y-2 text-center">
            <p className="text-[13px] font-semibold text-link">Lunas</p>
            <h1 className="text-[26px] leading-tight font-bold">Pelan-pelan, kita beresin bareng.</h1>
            <p className="text-[15px] text-muted">Catat utang, lihat jatuh tempo, dan susun urutan bayar dalam beberapa menit.</p>
          </div>
          <Card as="div" padded={false} className="divide-y divide-card-border">
            {POINTS.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-3 px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-track text-link">
                  <Icon width={20} height={20} />
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{title}</div>
                  <div className="text-[13px] text-muted">{body}</div>
                </div>
              </div>
            ))}
          </Card>
          <Button block onClick={() => setStep('license')}>
            Mulai
          </Button>
        </>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            void activate()
          }}
        >
          <div className="space-y-2 text-center">
            <h1 className="text-[22px] font-bold">Masukkan kode lisensi</h1>
            <p className="text-[15px] text-muted">Kodenya ada di halaman pembelian Lynk.id lu. Satu kode untuk satu HP.</p>
          </div>
          <TextField
            label="Kode lisensi"
            value={code}
            onChange={(v) => {
              setCode(v)
              setError('')
            }}
            placeholder="ABCD-EFGH-JKMN-PQRS"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="text-center font-semibold tracking-[0.12em] uppercase"
            hint="Huruf besar atau kecil sama saja. Tanda strip boleh ditulis, boleh tidak."
          />
          {error && (
            <p role="alert" className="text-center text-[14px] text-warn">
              {error}
            </p>
          )}
          <Button type="submit" block disabled={saving}>
            Aktifkan
          </Button>
          <button type="button" onClick={() => setStep('welcome')} className="min-h-touch w-full text-[14px] font-semibold text-link">
            Kembali
          </button>
        </form>
      )}
    </main>
  )
}
