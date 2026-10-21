import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

// Fase 0: preferensi disimpan di localStorage. Fase 1 memindahkannya ke tabel Pengaturan.
const KEY = 'lunas-theme'
const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function resolve(pref: ThemePref): Theme {
  if (pref !== 'system') return pref
  return query().matches ? 'dark' : 'light'
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [theme, setTheme] = useState<Theme>(() => resolve(readPref()))

  useEffect(() => {
    const apply = () => {
      const next = resolve(pref)
      setTheme(next)
      document.documentElement.dataset.theme = next
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute('content', next === 'dark' ? '#0F1C2B' : '#FFFFFF'))
    }
    apply()
    const mq = query()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])

  const setPref = useCallback((next: ThemePref) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // Penyimpanan diblokir: tema tetap berlaku untuk sesi ini.
    }
    setPrefState(next)
  }, [])

  const toggle = useCallback(() => setPref(theme === 'dark' ? 'light' : 'dark'), [theme, setPref])

  return { pref, theme, setPref, toggle }
}
