import { describe, expect, test } from 'vitest'
import { refineWithProvider } from '../src/llm'

const input = {
  draft: 'not interested',
  contextTree:
    'body\n  main\n    text "Do you want a sales call?"\n    > editor active\n      draft "not interested"',
  title: 'Inbox',
  url: 'https://mail.example.test/thread/1'
}

describe('refineWithProvider', () => {
  test('uses the Vercel AI SDK Codex streaming responses path', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(JSON.stringify({ detail: 'test stop' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      })
    }

    await expect(
      refineWithProvider(
        {
          provider: 'codex',
          openaiApiKey: '',
          openaiBaseURL: '',
          openaiModel: '',
          openaiReasoningEffort: 'none',
          codexAccessToken: 'codex-token',
          codexRefreshToken: 'codex-refresh-token',
          codexAccountId: 'account-123',
          codexBaseURL: 'https://chatgpt.com/backend-api/codex/',
          codexModel: 'gpt-5.5-fast',
          codexReasoningEffort: 'low',
          ollamaBaseURL: '',
          ollamaModel: ''
        },
        input,
        fetchFn as typeof fetch
      )
    ).rejects.toThrow()

    expect(calls[0].url).toBe('https://chatgpt.com/backend-api/codex/responses')
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe(
      'Bearer codex-token'
    )
    expect(new Headers(calls[0].init.headers).get('ChatGPT-Account-Id')).toBe(
      'account-123'
    )

    const body = JSON.parse(String(calls[0].init.body)) as {
      model: string
      stream: boolean
      instructions: string
      store: boolean
      service_tier: string
      reasoning: { effort: string }
    }
    expect(body.model).toBe('gpt-5.5')
    expect(body.stream).toBe(true)
    expect(body.instructions).toContain('You rewrite rough email replies')
    expect(body.store).toBe(false)
    expect(body.service_tier).toBe('priority')
    expect(body.reasoning.effort).toBe('low')
  })
})
