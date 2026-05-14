import {
  DEFAULT_SETTINGS,
  isProviderConfigured,
  normalizeSettings,
  type SimpleWordsSettings
} from './settings'
import { codexAccessTokenIsExpiring, refreshCodexTokens } from './codexAuth'
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
  const settings = normalizeSettings(await chrome.storage.local.get(DEFAULT_SETTINGS))

  if (!isProviderConfigured(settings)) {
    chrome.runtime.openOptionsPage()
    return { error: t('providerSetupRequired'), action: 'openOptions' }
  }

  let reply: string
  try {
    const freshSettings = await settingsWithFreshCodexToken(settings)
    reply = await refineWithProvider(freshSettings, {
      draft: request.draft,
      contextTree: request.contextTree,
      title: request.title,
      url: request.url
    })
  } catch (error) {
    return {
      error: providerFailureMessage(error),
      action: 'openOptions'
    }
  }

  return { reply }
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

  const tokens = await refreshCodexTokens(settings.codexRefreshToken)
  await chrome.storage.local.set({
    codexAccessToken: tokens.accessToken,
    codexRefreshToken: tokens.refreshToken
  })
  return {
    ...settings,
    codexAccessToken: tokens.accessToken,
    codexRefreshToken: tokens.refreshToken
  }
}

export {}
