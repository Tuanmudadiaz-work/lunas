import { useState } from 'react'
import { Button, Card, TextField } from '../components'
import { CheckCircleBigIcon, ShieldIcon, TrendIcon } from '../components/icons'
import { proxy, ProxyError } from '../api'
import { repo } from '../db/repo'
import { normalizeLicenseCode } from '../domain'

const POINTS = [
  { Icon: ShieldIcon, title: 'Data utang lu tetap di HP', body: 'Nggak ada akun, nggak ada nama atau NIK yang diminta.' },
  { Icon: TrendIcon, title: 'Urutan bayar yang jelas', body: 'Dihitung dari jatuh tempo, denda per hari, dan status OJK.' },
  { Icon: CheckCircleBigIcon, title: 'Kemajuan yang kelihatan', body: 'Setiap pembayaran menaikkan persentase lunas.' },
]

/**
 * Onboarding dua langkah. Kode lisensi diaktifkan ke proxy dan diikat ke kunci perangkat ini.
 * Tanpa `VITE_PROXY_URL` (hanya saat pengembangan), kode cukup dicek formatnya di HP.
 */
export function Onboarding() {
  const [step, setStep] = useState<'welcome' | 'license'>('welcome')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [canReset, setCanReset] = useState(false)
  const [saving, setSaving] = useState(false)

  const finish = (normalized: string) => repo.updateSettings({ licenseCode: normalized, onboardedAt: Date.now() })

  const activate = async (withReset = false) => {
    const normalized = normalizeLicenseCode(code)
    if (!normalized) {
      setError('Kodenya belum pas. Cek lagi 16 huruf dan angkanya, ya.')
      return
    }
    const client = proxy()
    if (!client && !import.meta.env.DEV) {
      setError('Server aktivasi belum diatur di versi aplikasi ini.')
      return
    }
    setSaving(true)
    setError('')
    setCanReset(false)
    try {
      if (client) {
        if (withReset) await client.resetDevice(normalized)
        await client.activate(normalized)
      }
      await finish(normalized)
    } catch (e) {
      setError(e instanceof ProxyError ? e.message : 'Aktivasi gagal. Coba lagi sebentar lagi.')
      setCanReset(e instanceof ProxyError && e.code === 'bound_elsewhere')
      setSaving(false)
    }
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
          {canReset && (
            <div className="space-y-2 rounded-box border border-card-border bg-card px-4 py-3 text-[14px]">
              <p>
                Pindah ke HP baru? Lu bisa melepas HP lama sekali secara mandiri. Setelah itu, reset berikutnya lewat bukti
                invoice Lynk.id.
              </p>
              <Button variant="ghost" block disabled={saving} onClick={() => void activate(true)}>
                Lepas HP lama dan aktifkan di sini
              </Button>
            </div>
          )}
          <Button type="submit" block disabled={saving}>
            {saving ? 'Mengaktifkan…' : 'Aktifkan'}
          </Button>
          <button type="button" onClick={() => setStep('welcome')} className="min-h-touch w-full text-[14px] font-semibold text-link">
            Kembali
          </button>
        </form>
      )}
    </main>
  )
}
