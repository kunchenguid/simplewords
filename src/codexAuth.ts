export type CodexAuth = {
  accessToken: string
  refreshToken: string
  accountId: string
}

const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const CODEX_OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token'
const CODEX_ACCESS_TOKEN_REFRESH_SKEW_MS = 120_000

export function parseCodexAuthJson(raw: string): CodexAuth {
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error('Select a valid Codex auth JSON file')
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Select a valid Codex auth JSON file')
  }

  const tokens = (payload as { tokens?: unknown }).tokens
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('Codex auth JSON is missing tokens')
  }

  const accessToken = cleanString(
    (tokens as { access_token?: unknown }).access_token
  )
  if (!accessToken) {
    throw new Error('Codex auth JSON is missing an access token')
  }

  const refreshToken = cleanString(
    (tokens as { refresh_token?: unknown }).refresh_token
  )
  const accountId =
    cleanString((payload as { account_id?: unknown }).account_id) ??
    extractAccountId(accessToken) ??
    ''

  return {
    accessToken,
    refreshToken: refreshToken ?? '',
    accountId
  }
}

export function codexAccessTokenIsExpiring(
  accessToken: string,
  nowMs = Date.now()
): boolean {
  const exp = decodeJwtPayload(accessToken)?.exp
  return (
    typeof exp === 'number' &&
    exp * 1000 <= nowMs + CODEX_ACCESS_TOKEN_REFRESH_SKEW_MS
  )
}

export async function refreshCodexTokens(
  refreshToken: string,
  fetchFn: typeof fetch = fetch
): Promise<{ accessToken: string; refreshToken: string }> {
  const cleanRefreshToken = cleanString(refreshToken)
  if (!cleanRefreshToken) {
    throw new Error('Codex refresh token is not configured')
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

  if (!response.ok) {
    throw new Error(
      `Codex token refresh failed with HTTP ${response.status}. Select auth.json again or sign in with Codex CLI.`
    )
  }

  const payload = (await response.json()) as {
    access_token?: unknown
    refresh_token?: unknown
  }
  const accessToken = cleanString(payload.access_token)
  if (!accessToken) {
    throw new Error('Codex token refresh response was missing access_token')
  }

  return {
    accessToken,
    refreshToken: cleanString(payload.refresh_token) ?? cleanRefreshToken
  }
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

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
