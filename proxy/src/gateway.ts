import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type * as z from 'zod/v4'
import { HAIKU, SONNET } from './config'

export type Usage = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }

/** Model menolak menjawab (klasifikasi keamanan). Tidak ada fallback ke model lain: PRD membatasi ke dua model. */
export class RefusalError extends Error {
  constructor() {
    super('refusal')
    this.name = 'RefusalError'
  }
}

/** Keluaran Haiku tidak sesuai skema atau terpotong. */
export class BadOutputError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'BadOutputError'
  }
}

export type StructuredRequest<T extends z.ZodType> = {
  system: string
  user: string
  schema: T
  maxTokens: number
}

export type ChatRequest = {
  system: string
  messages: Anthropic.MessageParam[]
  maxTokens: number
}

export type ChatStream = {
  /** Potongan teks jawaban, berurutan. */
  text: AsyncIterable<string>
  /** Selesai setelah `text` habis dibaca. */
  done: Promise<{ usage: Usage; stopReason: string | null }>
}

/** Satu-satunya pintu ke Claude API. Haiku untuk keluaran terstruktur, Sonnet untuk percakapan. */
export interface ModelGateway {
  structured<T extends z.ZodType>(req: StructuredRequest<T>): Promise<{ output: z.infer<T>; usage: Usage }>
  chat(req: ChatRequest): ChatStream
}

function usageOf(u: Anthropic.Usage): Usage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  }
}

/** System prompt tetap, ditandai untuk di-cache. Prompt yang terlalu pendek tidak ikut di-cache, dan itu tidak apa-apa. */
const cachedSystem = (text: string): Anthropic.TextBlockParam[] => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }]

export function anthropicGateway(client: Anthropic): ModelGateway {
  return {
    async structured(req) {
      // `create` (bukan `parse`) supaya stop_reason bisa dicek dulu: `parse` melempar galat parsing
      // pada jawaban yang ditolak, sehingga penolakan tampak seperti keluaran rusak.
      const response = await client.messages.create({
        model: HAIKU,
        max_tokens: req.maxTokens,
        system: cachedSystem(req.system),
        messages: [{ role: 'user', content: req.user }],
        output_config: { effort: 'low', format: zodOutputFormat(req.schema) },
      })
      if (response.stop_reason === 'refusal') throw new RefusalError()
      if (response.stop_reason === 'max_tokens') throw new BadOutputError('max_tokens')
      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        throw new BadOutputError('unparsed')
      }
      const parsed = req.schema.safeParse(raw)
      if (!parsed.success) throw new BadOutputError('schema')
      return { output: parsed.data, usage: usageOf(response.usage) }
    },

    chat(req) {
      const stream = client.messages.stream({
        model: SONNET,
        max_tokens: req.maxTokens,
        system: cachedSystem(req.system),
        messages: req.messages,
        output_config: { effort: 'medium' },
      })
      async function* text() {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text
        }
      }
      const done = stream.finalMessage().then((m) => ({ usage: usageOf(m.usage), stopReason: m.stop_reason }))
      // Cegah peringatan 'unhandled rejection' jika pemanggil berhenti membaca sebelum `done` ditunggu.
      done.catch(() => {})
      return { text: text(), done }
    },
  }
}
