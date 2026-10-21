import { useCallback, useEffect, useState } from 'react'
import { db } from '../db/db'
import { repo } from '../db/repo'
import type { ThemePref } from '../domain'

export type { ThemePref } from '../domain'
export type Theme = 'light' | 'dark'

// Sumber utama preferensi tema adalah tabel Pengaturan (IndexedDB). localStorage hanya salinan
// supaya tema benar sejak tampilan pertama, sebelum IndexedDB selesai dibaca.
const CACHE_KEY = 'lunas-theme'
const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function readCache(): ThemePref {
  try {
    const v = localStorage.getItem(CACHE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function writeCache(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(CACHE_KEY)
    else localStorage.setItem(CACHE_KEY, pref)
  } catch {
    // Penyimpanan diblokir: tema tetap berlaku untuk sesi ini.
  }
}

/** Membaca preferensi dari Pengaturan; nilai lama dari Fase 0 (hanya di localStorage) dipindahkan sekali. */
async function loadPref(): Promise<ThemePref> {
  const stored = await db.settings.get('themePref')
  if (stored) return stored.value as ThemePref
  const cached = readCache()
  if (cached !== 'system') await repo.updateSettings({ themePref: cached })
  return cached
}

function resolve(pref: ThemePref): Theme {
  if (pref !== 'system') return pref
  return query().matches ? 'dark' : 'light'
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readCache)
  const [theme, setTheme] = useState<Theme>(() => resolve(readCache()))

  useEffect(() => {
    let active = true
    loadPref()
      .then((stored) => {
        if (!active) return
        writeCache(stored)
        setPrefState(stored)
      })
      .catch(() => {
        // IndexedDB tidak tersedia: pakai salinan localStorage.
      })
    return () => {
      active = false
    }
  }, [])

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
    writeCache(next)
    setPrefState(next)
    repo.updateSettings({ themePref: next }).catch(() => {
      // Gagal menyimpan ke IndexedDB: tema tetap berlaku lewat salinan localStorage.
    })
  }, [])

  const toggle = useCallback(() => setPref(theme === 'dark' ? 'light' : 'dark'), [theme, setPref])

  return { pref, theme, setPref, toggle }
}
