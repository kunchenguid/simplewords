import {
  DEFAULT_SETTINGS,
  isProviderConfigured,
  normalizeSettings,
  type SimpleWordsSettings
} from './settings'
import {
  buildCodexAuthorizationUrl,
  codexAccessTokenIsExpiring,
  createCodexOAuthState,
  createCodexPkce,
  exchangeCodexAuthorizationCode,
  extractCodexAccountId,
  refreshCodexTokens
} from './codexAuth'
import { t } from './i18n'
import { refineWithProvider } from './llm'

type RefineRequest = {
  type: 'simplewords.refine'
  draft: string
  contextTree: string
  title: string
  url: string
}

type OpenOptionsRequest = {
  type: 'simplewords.openOptions'
}

type CodexOAuthLoginRequest = {
  type: 'simplewords.codexOAuthLogin'
}

type RuntimeRequest =
  | RefineRequest
  | OpenOptionsRequest
  | CodexOAuthLoginRequest

type RefineResponse = {
  reply?: string
  error?: string
  action?: 'openOptions'
}

type CodexOAuthLoginResponse = {
  codexAuth?: {
    accessToken: string
    refreshToken: string
    accountId: string
  }
  error?: string
}

type RuntimeResponse = RefineResponse | CodexOAuthLoginResponse

type CodexRefreshResult = {
  accessToken: string
  refreshToken: string
  accountId?: string
}

let codexRefreshPromise: Promise<CodexRefreshResult> | undefined
const CODEX_OAUTH_CALLBACK_TIMEOUT_MS = 120_000

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeRequest,
    _sender,
    sendResponse: (response: RuntimeResponse) => void
  ) => {
    if (message.type === 'simplewords.openOptions') {
      chrome.runtime.openOptionsPage()
      sendResponse({})
      return false
    }

    if (message.type === 'simplewords.codexOAuthLogin') {
      startCodexOAuthLogin()
        .then(sendResponse)
        .catch((error: unknown) => {
          sendResponse({
            error:
              error instanceof Error
                ? error.message
                : t('codexOAuthLoginFailed')
          })
        })

      return true
    }

    if (message.type !== 'simplewords.refine') {
      return false
    }

    refineReply(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          error:
            error instanceof Error ? error.message : t('unableToRefineReply')
        })
      })

    return true
  }
)

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage()
  }
})

async function refineReply(request: RefineRequest): Promise<RefineResponse> {
  const settings = normalizeSettings(
    await chrome.storage.local.get(DEFAULT_SETTINGS)
  )

  if (!isProviderConfigured(settings)) {
    chrome.runtime.openOptionsPage()
    return { error: t('providerSetupRequired'), action: 'openOptions' }
  }

  let reply: string
  try {
    const freshSettings = await settingsWithFreshCodexToken(settings)
    try {
      reply = await refineWithProvider(freshSettings, refineInput(request))
    } catch (error) {
      if (!shouldRetryWithFreshCodexToken(freshSettings, error)) {
        throw error
      }

      reply = await refineWithProvider(
        await refreshAndPersistCodexToken(freshSettings),
        refineInput(request)
      )
    }
  } catch (error) {
    return {
      error: providerFailureMessage(error),
      ...(shouldOpenOptionsForProviderFailure(error)
        ? { action: 'openOptions' as const }
        : {})
    }
  }

  return { reply }
}

async function startCodexOAuthLogin(): Promise<CodexOAuthLoginResponse> {
  const redirectUri = 'http://localhost:1455/auth/callback'
  const pkce = await createCodexPkce()
  const state = createCodexOAuthState()
  const authorizationUrl = buildCodexAuthorizationUrl({
    redirectUri,
    codeChallenge: pkce.codeChallenge,
    state
  })
  const tab = await createTab({ active: true })
  if (typeof tab.id !== 'number') {
    throw new Error(t('codexOAuthLoginFailed'))
  }

  try {
    const callback = createCodexOAuthCallbackWaiter(tab.id, redirectUri, state)
    try {
      await updateTab(tab.id, { url: authorizationUrl })
    } catch (error) {
      callback.cancel()
      throw error
    }
    const code = await callback.promise
    const tokens = await exchangeCodexAuthorizationCode({
      code,
      redirectUri,
      codeVerifier: pkce.codeVerifier
    })
    const accountId = extractCodexAccountId(tokens.accessToken) ?? ''
    const codexAuth = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accountId
    }

    await chrome.storage.local.set({
      provider: 'codex',
      codexAccessToken: codexAuth.accessToken,
      codexRefreshToken: codexAuth.refreshToken,
      codexAccountId: codexAuth.accountId
    })

    return { codexAuth }
  } finally {
    await removeTab(tab.id)
  }
}

function createCodexOAuthCallbackWaiter(
  tabId: number,
  redirectUri: string,
  state: string
): { promise: Promise<string>; cancel: () => void } {
  let cancel = () => {}
  const promise = new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout)
      chrome.tabs.onUpdated.removeListener(listener)
      chrome.tabs.onRemoved.removeListener(removedListener)
    }
    cancel = cleanup
    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.OnUpdatedInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (updatedTabId !== tabId) {
        return
      }

      const url = changeInfo.url ?? tab.url
      if (!url) {
        return
      }

      const callback = parseCodexOAuthCallbackUrl(url, redirectUri, state)
      if (!callback) {
        return
      }

      cleanup()
      if (callback.error) {
        reject(new Error(callback.error))
        return
      }

      resolve(callback.code ?? '')
    }
    const removedListener = (removedTabId: number) => {
      if (removedTabId !== tabId) {
        return
      }

      cleanup()
      reject(new Error(t('codexOAuthLoginFailed')))
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(t('codexOAuthLoginFailed')))
    }, CODEX_OAUTH_CALLBACK_TIMEOUT_MS)

    chrome.tabs.onUpdated.addListener(listener)
    chrome.tabs.onRemoved.addListener(removedListener)
  })

  return { promise, cancel }
}

function parseCodexOAuthCallbackUrl(
  rawUrl: string,
  redirectUri: string,
  state: string
):
  | { code: string; error?: never }
  | { error: string; code?: never }
  | undefined {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return undefined
  }

  const expected = new URL(redirectUri)
  if (url.origin !== expected.origin || url.pathname !== expected.pathname) {
    return undefined
  }

  if (url.searchParams.get('state') !== state) {
    return { error: t('codexOAuthStateMismatch') }
  }

  const error =
    url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (error) {
    return { error }
  }

  const code = url.searchParams.get('code')
  return code ? { code } : { error: t('codexOAuthMissingCode') }
}

function createTab(
  createProperties: chrome.tabs.CreateProperties
): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    const handleTab = (tab: chrome.tabs.Tab) => {
      const message = chrome.runtime.lastError?.message
      if (message) {
        reject(new Error(message))
        return
      }

      resolve(tab)
    }
    const result = chrome.tabs.create(createProperties, handleTab) as
      | Promise<chrome.tabs.Tab>
      | undefined
    result?.then(resolve, reject)
  })
}

function updateTab(
  tabId: number,
  updateProperties: chrome.tabs.UpdateProperties
): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    const handleTab = (tab?: chrome.tabs.Tab) => {
      const message = chrome.runtime.lastError?.message
      if (message) {
        reject(new Error(message))
        return
      }

      if (!tab) {
        reject(new Error(t('codexOAuthLoginFailed')))
        return
      }

      resolve(tab)
    }
    const result = chrome.tabs.update(tabId, updateProperties, handleTab) as
      | Promise<chrome.tabs.Tab>
      | undefined
    result?.then(resolve, reject)
  })
}

function removeTab(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const result = chrome.tabs.remove(tabId, () => resolve()) as
      | Promise<void>
      | undefined
    result?.then(
      () => resolve(),
      () => resolve()
    )
  })
}

function refineInput(request: RefineRequest) {
  return {
    draft: request.draft,
    contextTree: request.contextTree,
    title: request.title,
    url: request.url
  }
}

function providerFailureMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : ''
  if (!detail) {
    return t('providerRefineFailed')
  }

  return [
    t('providerRefineFailed'),
    '',
    `${t('providerErrorDetailLabel')} ${detail.slice(0, 600)}`
  ].join('\n')
}

async function settingsWithFreshCodexToken(
  settings: SimpleWordsSettings
): Promise<SimpleWordsSettings> {
  if (
    settings.provider !== 'codex' ||
    !codexAccessTokenIsExpiring(settings.codexAccessToken)
  ) {
    return settings
  }

  return refreshAndPersistCodexToken(settings)
}

async function refreshAndPersistCodexToken(
  settings: SimpleWordsSettings
): Promise<SimpleWordsSettings> {
  if (!codexRefreshPromise) {
    codexRefreshPromise = refreshCodexTokens(settings.codexRefreshToken)
      .then(async (tokens) => {
        const accountId = extractCodexAccountId(tokens.accessToken)
        const storedTokens = {
          codexAccessToken: tokens.accessToken,
          codexRefreshToken: tokens.refreshToken,
          ...(accountId ? { codexAccountId: accountId } : {})
        }

        await chrome.storage.local.set(storedTokens)

        return {
          ...tokens,
          ...(accountId ? { accountId } : {})
        }
      })
      .finally(() => {
        codexRefreshPromise = undefined
      })
  }

  const tokens = await codexRefreshPromise
  return {
    ...settings,
    codexAccessToken: tokens.accessToken,
    codexRefreshToken: tokens.refreshToken,
    codexAccountId: tokens.accountId ?? settings.codexAccountId
  }
}

function shouldRetryWithFreshCodexToken(
  settings: SimpleWordsSettings,
  error: unknown
): boolean {
  return settings.provider === 'codex' && errorStatus(error) === 401
}

function shouldOpenOptionsForProviderFailure(error: unknown): boolean {
  const status = errorStatus(error)
  if (status === 401 || status === 403) {
    return true
  }

  const detail = error instanceof Error ? error.message : ''
  return /codex .*refresh|refresh token/i.test(detail)
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const directStatus = readStatus(error)
  if (directStatus) {
    return directStatus
  }

  return errorStatus((error as { cause?: unknown }).cause)
}

function readStatus(error: object): number | undefined {
  const status = (error as { statusCode?: unknown; status?: unknown })
    .statusCode
  if (typeof status === 'number') {
    return status
  }

  const fallbackStatus = (error as { status?: unknown }).status
  return typeof fallbackStatus === 'number' ? fallbackStatus : undefined
}

export {}
