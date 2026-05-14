import { describe, expect, test } from 'vitest'
import {
  buildCodexAuthorizationUrl,
  codexAccessTokenIsExpiring,
  exchangeCodexAuthorizationCode,
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
    expect(codexAccessTokenIsExpiring('not-a-jwt', 900_000)).toBe(true)
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

  test('builds a Codex authorization URL for the localhost callback flow', () => {
    const result = buildCodexAuthorizationUrl({
      redirectUri: 'http://localhost:1455/auth/callback',
      codeChallenge: 'challenge-123',
      state: 'state-123'
    })

    const url = new URL(result)
    expect(url.origin).toBe('https://auth.openai.com')
    expect(url.pathname).toBe('/oauth/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe(
      'app_EMoamEEZ73f0CkXaXp7hrann'
    )
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:1455/auth/callback'
    )
    expect(url.searchParams.get('code_challenge')).toBe('challenge-123')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe('state-123')
    expect(url.searchParams.get('codex_cli_simplified_flow')).toBe('true')
    expect(url.searchParams.get('scope')).toContain('offline_access')
  })

  test('exchanges a Codex authorization code using PKCE', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return Response.json({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      })
    }

    const result = await exchangeCodexAuthorizationCode(
      {
        code: 'authorization-code',
        redirectUri: 'http://localhost:1455/auth/callback',
        codeVerifier: 'verifier-123'
      },
      fetchFn as typeof fetch
    )

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token'
    })
    expect(calls[0].url).toBe('https://auth.openai.com/oauth/token')
    expect(calls[0].init.method).toBe('POST')
    expect(String(calls[0].init.body)).toContain(
      'grant_type=authorization_code'
    )
    expect(String(calls[0].init.body)).toContain('code=authorization-code')
    expect(String(calls[0].init.body)).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fauth%2Fcallback'
    )
    expect(String(calls[0].init.body)).toContain('code_verifier=verifier-123')
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
