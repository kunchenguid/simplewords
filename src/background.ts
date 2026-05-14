import {
  DEFAULT_SETTINGS,
  isProviderConfigured,
  normalizeSettings,
  type SimpleWordsSettings
} from './settings'
import {
  codexAccessTokenIsExpiring,
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

type RuntimeRequest = RefineRequest | OpenOptionsRequest

type RefineResponse = {
  reply?: string
  error?: string
  action?: 'openOptions'
}

type CodexRefreshResult = {
  accessToken: string
  refreshToken: string
  accountId?: string
}

let codexRefreshPromise: Promise<CodexRefreshResult> | undefined

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeRequest,
    _sender,
    sendResponse: (response: RefineResponse) => void
  ) => {
    if (message.type === 'simplewords.openOptions') {
      chrome.runtime.openOptionsPage()
      sendResponse({})
      return false
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
