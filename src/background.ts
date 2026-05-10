import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type SimpleWordsSettings
} from './settings'
import { codexAccessTokenIsExpiring, refreshCodexTokens } from './codexAuth'
import { refineWithProvider } from './llm'

type RefineRequest = {
  type: 'simplewords.refine'
  draft: string
  contextTree: string
  title: string
  url: string
}

type RefineResponse = {
  reply?: string
  error?: string
}

chrome.runtime.onMessage.addListener(
  (
    message: RefineRequest,
    _sender,
    sendResponse: (response: RefineResponse) => void
  ) => {
    if (message.type !== 'simplewords.refine') {
      return false
    }

    refineReply(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          error:
            error instanceof Error ? error.message : 'Unable to refine reply'
        })
      })

    return true
  }
)

async function refineReply(request: RefineRequest): Promise<RefineResponse> {
  const settings = await settingsWithFreshCodexToken(
    normalizeSettings(await chrome.storage.local.get(DEFAULT_SETTINGS))
  )
  const reply = await refineWithProvider(settings, {
    draft: request.draft,
    contextTree: request.contextTree,
    title: request.title,
    url: request.url
  })

  return { reply }
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
