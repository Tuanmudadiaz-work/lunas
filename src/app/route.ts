import { useCallback, useEffect, useState } from 'react'

export type Route = 'beranda' | 'utang' | 'kalender' | 'tenang' | 'rencana' | 'komponen'

const ROUTES: Route[] = ['beranda', 'utang', 'kalender', 'tenang', 'rencana', 'komponen']

function readHash(): Route {
  const key = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(key) ? key : 'beranda'
}

/** Navigasi lewat hash (#/utang) supaya tombol kembali di HP berjalan tanpa server. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(readHash)
  const [hasHistory, setHasHistory] = useState(false)

  useEffect(() => {
    const onChange = () => {
      setRoute(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    if (readHash() === next) return
    setHasHistory(true)
    window.location.hash = `/${next}`
  }, [])

  /** Kembali ke layar sebelumnya di dalam aplikasi; jika dibuka langsung, ke tujuan cadangan. */
  const back = useCallback(
    (fallback: Route) => {
      if (hasHistory) window.history.back()
      else navigate(fallback)
    },
    [hasHistory, navigate],
  )

  return { route, navigate, back }
}
