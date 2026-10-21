import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { anthropicGateway, BadOutputError, RefusalError } from '../src/gateway'
import { CHAT_SYSTEM, EXTRACT_SYSTEM } from '../src/prompts'
import { DailyCards } from '../src/schemas'

type Captured = { url: string; body: Record<string, unknown> }

/** SDK asli dengan fetch palsu: memeriksa bentuk permintaan tanpa memanggil API sungguhan. */
function clientWith(respond: (body: Record<string, unknown>) => Response) {
  const captured: Captured[] = []
  const client = new Anthropic({
    apiKey: 'sk-ant-test',
    maxRetries: 0,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'))
      captured.push({ url: String(input), body })
      return respond(body)
    },
  })
  return { client, captured }
}

const usage = { input_tokens: 50, output_tokens: 20, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 }

const message = (text: string, stop_reason = 'end_turn') =>
  new Response(
    JSON.stringify({
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-5-5',
      content: [{ type: 'text', text }],
      stop_reason,
      stop_sequence: null,
      usage,
    }),
    { headers: { 'content-type': 'application/json' } },
  )

const cards = {
  tenang: { title: 'Napas pelan', body: 'Satu menit dulu.' },
  rencana: { title: 'Hampir lunas', body: 'Pinjaman B 85%.' },
  hak: { title: 'Cek ke OJK', body: 'Pastikan statusnya.' },
}

function sse(events: Record<string, unknown>[]) {
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } })
}

describe('gateway Anthropic', () => {
  it('Haiku: model, effort rendah, keluaran JSON terstruktur, system prompt di-cache', async () => {
    const { client, captured } = clientWith(() => message(JSON.stringify(cards)))
    const result = await anthropicGateway(client).structured({ system: EXTRACT_SYSTEM, user: '<data>x</data>', schema: DailyCards, maxTokens: 2048 })
    expect(result.output).toEqual(cards)
    expect(result.usage).toEqual({ inputTokens: 50, outputTokens: 20, cacheReadTokens: 800, cacheWriteTokens: 0 })

    const body = captured[0].body
    expect(captured[0].url).toMatch(/\/v1\/messages$/)
    expect(body.model).toBe('claude-haiku-5-5')
    expect(body.max_tokens).toBe(2048)
    expect(body.system).toEqual([{ type: 'text', text: EXTRACT_SYSTEM, cache_control: { type: 'ephemeral' } }])
    expect(body.output_config).toMatchObject({ effort: 'low', format: { type: 'json_schema' } })
    expect(body).not.toHaveProperty('fallbacks')
    expect(body).not.toHaveProperty('temperature')
  })

  it('Haiku: penolakan dan keluaran terpotong jadi galat yang jelas', async () => {
    const refused = clientWith(() => message('', 'refusal'))
    await expect(anthropicGateway(refused.client).structured({ system: 's', user: 'u', schema: DailyCards, maxTokens: 10 })).rejects.toBeInstanceOf(
      RefusalError,
    )
    const cut = clientWith(() => message('{"tenang":', 'max_tokens'))
    await expect(anthropicGateway(cut.client).structured({ system: 's', user: 'u', schema: DailyCards, maxTokens: 10 })).rejects.toBeInstanceOf(
      BadOutputError,
    )
  })

  it('Sonnet: streaming, effort medium, tanpa model lain, teks dan pemakaian token terbaca', async () => {
    const { client, captured } = clientWith(() =>
      sse([
        {
          type: 'message_start',
          message: { id: 'msg_2', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null, usage },
        },
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Wajar ' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'banget.' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 33 } },
        { type: 'message_stop' },
      ]),
    )
    const chat = anthropicGateway(client).chat({ system: CHAT_SYSTEM, messages: [{ role: 'user', content: 'halo' }], maxTokens: 4096 })
    const parts: string[] = []
    for await (const t of chat.text) parts.push(t)
    expect(parts.join('')).toBe('Wajar banget.')
    const done = await chat.done
    expect(done.stopReason).toBe('end_turn')
    expect(done.usage.outputTokens).toBe(33)

    const body = captured[0].body
    expect(body).toMatchObject({ model: 'claude-sonnet-5-5', stream: true, max_tokens: 4096, output_config: { effort: 'medium' } })
    expect(body.system).toEqual([{ type: 'text', text: CHAT_SYSTEM, cache_control: { type: 'ephemeral' } }])
    expect(body).not.toHaveProperty('fallbacks')
    expect(body).not.toHaveProperty('thinking')
  })
})
