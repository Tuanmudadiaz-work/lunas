import { useEffect, useState } from 'react'
import { useLunasData } from './app/data'
import { useRoute, type Route } from './app/route'
import type { SheetState } from './app/sheets'
import { PillNav, type TabKey } from './components'
import Showcase from './pages/Showcase'
import { Beranda } from './screens/Beranda'
import { Kalender } from './screens/Kalender'
import { Onboarding } from './screens/Onboarding'
import { Rencana } from './screens/Rencana'
import { Tenang } from './screens/Tenang'
import { Utang } from './screens/Utang'
import { LoanDetailSheet } from './sheets/LoanDetailSheet'
import { LoanFormSheet } from './sheets/LoanFormSheet'
import { PaymentSheet } from './sheets/PaymentSheet'
import { TambahSheet } from './sheets/TambahSheet'
import { useTheme } from './theme/useTheme'

/** Rencana bayar tidak punya tab sendiri; menu bawah menandai Utang saat Rencana terbuka. */
const TAB_OF: Record<Exclude<Route, 'komponen'>, TabKey> = {
  beranda: 'beranda',
  utang: 'utang',
  kalender: 'kalender',
  tenang: 'tenang',
  rencana: 'utang',
}

export default function App() {
  const { theme, toggle } = useTheme()
  const { route, navigate, back } = useRoute()
  const data = useLunasData()
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  if (route === 'komponen') return <Showcase />
  // IndexedDB masih dibaca: biarkan kosong sebentar daripada menampilkan layar yang salah.
  if (!data) return null
  if (!data.settings.onboardedAt) return <Onboarding />

  const close = () => setSheet(null)
  const done = (message: string) => {
    setSheet(null)
    setToast(message)
  }
  const sheetLoan = sheet && 'loanId' in sheet && sheet.loanId ? data.loans.find((l) => l.id === sheet.loanId) : undefined

  return (
    <>
      <main className="mx-auto max-w-[430px] px-page pt-7 pb-[124px]">
        {route === 'beranda' && <Beranda data={data} theme={theme} onToggleTheme={toggle} navigate={navigate} openSheet={setSheet} />}
        {route === 'utang' && <Utang data={data} navigate={navigate} openSheet={setSheet} />}
        {route === 'kalender' && <Kalender data={data} openSheet={setSheet} />}
        {route === 'tenang' && <Tenang />}
        {route === 'rencana' && <Rencana data={data} back={() => back('utang')} navigate={navigate} />}
      </main>

      <PillNav active={TAB_OF[route]} onChange={navigate} onAdd={() => setSheet({ kind: 'tambah' })} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[104px] z-30 flex justify-center px-page">
        {toast && (
          <p className="max-w-[390px] rounded-full bg-text px-4 py-2.5 text-center text-[14px] font-medium text-bg shadow-soft">{toast}</p>
        )}
      </div>

      {sheet?.kind === 'tambah' && <TambahSheet hasLoans={data.loans.length > 0} onClose={close} openSheet={setSheet} />}
      {sheet?.kind === 'loanForm' && (
        <LoanFormSheet
          loan={sheetLoan}
          onClose={close}
          onSaved={(loan, created) => done(created ? `${loan.name} tersimpan.` : 'Perubahan tersimpan.')}
        />
      )}
      {sheet?.kind === 'payment' && (
        <PaymentSheet loans={data.loans} payments={data.payments} loanId={sheet.loanId} onClose={close} onSaved={done} />
      )}
      {sheet?.kind === 'loanDetail' && sheetLoan && (
        <LoanDetailSheet loan={sheetLoan} payments={data.payments} onClose={close} openSheet={setSheet} onDeleted={done} />
      )}
    </>
  )
}
