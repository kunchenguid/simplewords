import { t } from './i18n'

export type CodexAuth = {
  accessToken: string
  refreshToken: string
  accountId: string
}

const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const CODEX_OAUTH_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize'
const CODEX_OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token'
const CODEX_ACCESS_TOKEN_REFRESH_SKEW_MS = 120_000
const CODEX_OAUTH_SCOPE =
  'openid profile email offline_access api.connectors.read api.connectors.invoke'

export type CodexPkce = {
  codeVerifier: string
  codeChallenge: string
}

export function parseCodexAuthJson(raw: string): CodexAuth {
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error(t('codexAuthInvalidFile'))
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error(t('codexAuthInvalidFile'))
  }

  const tokens = (payload as { tokens?: unknown }).tokens
  if (!tokens || typeof tokens !== 'object') {
    throw new Error(t('codexAuthMissingTokens'))
  }

  const accessToken = cleanString(
    (tokens as { access_token?: unknown }).access_token
  )
  if (!accessToken) {
    throw new Error(t('codexAuthMissingAccessToken'))
  }

  const refreshToken = cleanString(
    (tokens as { refresh_token?: unknown }).refresh_token
  )
  if (!refreshToken) {
    throw new Error(t('codexRefreshTokenMissing'))
  }
  const accountId =
    cleanString((payload as { account_id?: unknown }).account_id) ??
    extractAccountId(accessToken) ??
    ''

  return {
    accessToken,
    refreshToken,
    accountId
  }
}

export function codexAccessTokenIsExpiring(
  accessToken: string,
  nowMs = Date.now()
): boolean {
  const exp = decodeJwtPayload(accessToken)?.exp
  return (
    typeof exp !== 'number' ||
    exp * 1000 <= nowMs + CODEX_ACCESS_TOKEN_REFRESH_SKEW_MS
  )
}

export function extractCodexAccountId(accessToken: string): string | undefined {
  return extractAccountId(accessToken)
}

export async function createCodexPkce(): Promise<CodexPkce> {
  const bytes = new Uint8Array(64)
  crypto.getRandomValues(bytes)
  const codeVerifier = base64UrlEncodeBytes(bytes)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  )

  return {
    codeVerifier,
    codeChallenge: base64UrlEncodeBytes(new Uint8Array(digest))
  }
}

export function createCodexOAuthState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncodeBytes(bytes)
}

export function buildCodexAuthorizationUrl({
  redirectUri,
  codeChallenge,
  state
}: {
  redirectUri: string
  codeChallenge: string
  state: string
}): string {
  const url = new URL(CODEX_OAUTH_AUTHORIZE_URL)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: CODEX_OAUTH_SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state,
    originator: 'codex_cli_rs'
  }).toString()
  return url.toString()
}

export async function exchangeCodexAuthorizationCode(
  {
    code,
    redirectUri,
    codeVerifier
  }: {
    code: string
    redirectUri: string
    codeVerifier: string
  },
  fetchFn: typeof fetch = fetch
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetchFn(CODEX_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CODEX_OAUTH_CLIENT_ID,
      code_verifier: codeVerifier
    })
  })

  return readCodexTokenResponse(response, {
    httpFailureKey: 'codexOAuthHttpFailure',
    missingAccessTokenKey: 'codexOAuthMissingAccessToken'
  })
}

export async function refreshCodexTokens(
  refreshToken: string,
  fetchFn: typeof fetch = fetch
): Promise<{ accessToken: string; refreshToken: string }> {
  const cleanRefreshToken = cleanString(refreshToken)
  if (!cleanRefreshToken) {
    throw new Error(t('codexRefreshTokenMissing'))
  }

  const response = await fetchFn(CODEX_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: cleanRefreshToken,
      client_id: CODEX_OAUTH_CLIENT_ID
    })
  })

  return readCodexTokenResponse(response, {
    fallbackRefreshToken: cleanRefreshToken,
    httpFailureKey: 'codexTokenRefreshHttpFailure',
    missingAccessTokenKey: 'codexTokenRefreshMissingAccessToken'
  })
}

function extractAccountId(accessToken: string): string | undefined {
  const claims = decodeJwtPayload(accessToken)
  return (
    cleanString(claims?.chatgpt_account_id) ??
    cleanString(claims?.['https://api.openai.com/auth']?.chatgpt_account_id)
  )
}

type JwtClaims = Record<string, unknown> & {
  chatgpt_account_id?: unknown
  exp?: unknown
  'https://api.openai.com/auth'?: {
    chatgpt_account_id?: unknown
  }
}

function decodeJwtPayload(token: string): JwtClaims | undefined {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return undefined
  }

  try {
    const payload: unknown = JSON.parse(base64UrlDecode(parts[1]))
    return payload && typeof payload === 'object'
      ? (payload as JwtClaims)
      : undefined
  } catch {
    return undefined
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return decodeURIComponent(
    Array.from(
      atob(padded),
      (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
    ).join('')
  )
}

async function readCodexTokenResponse(
  response: Response,
  {
    fallbackRefreshToken = '',
    httpFailureKey,
    missingAccessTokenKey
  }: {
    fallbackRefreshToken?: string
    httpFailureKey: 'codexOAuthHttpFailure' | 'codexTokenRefreshHttpFailure'
    missingAccessTokenKey:
      | 'codexOAuthMissingAccessToken'
      | 'codexTokenRefreshMissingAccessToken'
  }
): Promise<{ accessToken: string; refreshToken: string }> {
  if (!response.ok) {
    throw new Error(t(httpFailureKey, String(response.status)))
  }

  const payload = (await response.json()) as {
    access_token?: unknown
    refresh_token?: unknown
  }
  const accessToken = cleanString(payload.access_token)
  if (!accessToken) {
    throw new Error(t(missingAccessTokenKey))
  }
  const refreshToken =
    cleanString(payload.refresh_token) ?? fallbackRefreshToken
  if (!refreshToken) {
    throw new Error(t('codexRefreshTokenMissing'))
  }

  return {
    accessToken,
    refreshToken
  }
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
