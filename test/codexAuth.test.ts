import { describe, expect, test } from 'vitest'
import {
  codexAccessTokenIsExpiring,
  parseCodexAuthJson,
  refreshCodexTokens
} from '../src/codexAuth'

describe('parseCodexAuthJson', () => {
  test('reads Codex CLI access token and account ID from auth.json', () => {
    const result = parseCodexAuthJson(
      JSON.stringify({
        tokens: {
          access_token: 'codex-access-token',
          refresh_token: 'codex-refresh-token'
        },
        account_id: 'account-123'
      })
    )

    expect(result).toEqual({
      accessToken: 'codex-access-token',
      refreshToken: 'codex-refresh-token',
      accountId: 'account-123'
    })
  })

  test('extracts account ID from access token claims when auth.json has no account_id', () => {
    const token = jwtWithPayload({
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'account-from-token'
      }
    })

    const result = parseCodexAuthJson(
      JSON.stringify({
        tokens: {
          access_token: token,
          refresh_token: 'codex-refresh-token'
        }
      })
    )

    expect(result.accountId).toBe('account-from-token')
  })

  test('throws for malformed auth payloads', () => {
    expect(() => parseCodexAuthJson('{')).toThrow(/valid Codex auth JSON/)
    expect(() => parseCodexAuthJson(JSON.stringify({ tokens: {} }))).toThrow(
      /access token/
    )
    expect(() =>
      parseCodexAuthJson(
        JSON.stringify({ tokens: { access_token: 'codex-access-token' } })
      )
    ).toThrow(/refresh token/)
  })

  test('detects expiring access tokens', () => {
    const expiring = jwtWithPayload({ exp: 1_000 })
    const valid = jwtWithPayload({ exp: 2_000 })

    expect(codexAccessTokenIsExpiring(expiring, 900_000)).toBe(true)
    expect(codexAccessTokenIsExpiring(valid, 900_000)).toBe(false)
    expect(codexAccessTokenIsExpiring('not-a-jwt', 900_000)).toBe(false)
  })

  test('refreshes Codex tokens using the Codex OAuth client', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(
        JSON.stringify({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    }

    const result = await refreshCodexTokens(
      'old-refresh-token',
      fetchFn as typeof fetch
    )

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token'
    })
    expect(calls[0].url).toBe('https://auth.openai.com/oauth/token')
    expect(calls[0].init.method).toBe('POST')
    expect(String(calls[0].init.body)).toContain('grant_type=refresh_token')
    expect(String(calls[0].init.body)).toContain(
      'refresh_token=old-refresh-token'
    )
    expect(String(calls[0].init.body)).toContain(
      'client_id=app_EMoamEEZ73f0CkXaXp7hrann'
    )
  })
})

function jwtWithPayload(payload: unknown): string {
  return [
    base64UrlEncode(JSON.stringify({ alg: 'none' })),
    base64UrlEncode(JSON.stringify(payload)),
    'signature'
  ].join('.')
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
