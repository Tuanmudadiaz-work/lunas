import { repo } from '../db/repo'
import { deviceSigner } from './device'
import { createProxyClient, type ProxyClient } from './proxyClient'

export { ProxyError, type Quota } from './proxyClient'

/** Alamat proxy dari variabel build `VITE_PROXY_URL`. Kosong berarti aktivasi server dan fitur AI belum tersedia. */
export const PROXY_URL: string = (import.meta.env.VITE_PROXY_URL ?? '').replace(/\/+$/, '')

let client: ProxyClient | null = null

export function proxy(): ProxyClient | null {
  if (!PROXY_URL) return null
  client ??= createProxyClient({
    baseUrl: PROXY_URL,
    device: deviceSigner,
    tokens: {
      get: async () => {
        const s = await repo.getSettings()
        return s.licenseToken ? { token: s.licenseToken, expiresAt: s.licenseTokenExpiresAt } : null
      },
      set: (v) => repo.updateSettings({ licenseToken: v?.token ?? '', licenseTokenExpiresAt: v?.expiresAt ?? 0 }),
      code: async () => (await repo.getSettings()).licenseCode,
    },
  })
  return client
}
