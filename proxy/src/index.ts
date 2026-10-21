import Anthropic from '@anthropic-ai/sdk'
import { createApp } from './app'
import { limitsFrom, type Env } from './config'
import { anthropicGateway } from './gateway'

/**
 * Worker Cloudflare. HP tidak pernah memegang kunci API: semua permintaan AI lewat sini,
 * diperiksa lisensi, tanda tangan perangkat, laju, dan kuotanya, lalu diteruskan ke model yang sesuai tugas.
 */
export default {
  async fetch(request: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const app = createApp({
      kv: env.LUNAS_KV,
      gateway: anthropicGateway(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 })),
      secrets: env,
      limits: limitsFrom(env),
      waitUntil: (p) => ctx.waitUntil(p),
    })
    return app.fetch(request)
  },
}
