import { safeChromeCall } from './chromeApi'

export const EN_MESSAGES = {
  extensionName: 'Simple Words',
  extensionDescription:
    'Never waste time wordsmithing your replies. Just say what you mean, and let AI help turn it into a respectful draft before you send.',
  optionsTitle: 'Simple Words Options',
  optionsLede:
    'Choose an LLM provider. The extension calls the selected provider directly after you click the Simple Words button.',
  stepOneLabel: 'Step 1',
  stepTwoLabel: 'Step 2',
  stepThreeLabel: 'Step 3',
  writingInstructionsHeading: 'Writing style',
  writingInstructionsLead:
    'Teach Simple Words enough about you to make replies feel natural. The full system prompt is there when you need precise control.',
  myNameLabel: 'My name',
  optionalPlaceholder:
    'Optional. When set, this is used to generate your signature.',
  systemPromptLabel: 'System prompt',
  systemPromptHelp: 'Leave blank to restore the default system prompt.',
  enabledDomainsHeading: 'Where it appears',
  enabledDomainsLead:
    'Simple Words only appears on these websites. Add one domain per line.',
  enabledDomainsLabel: 'Domains',
  enabledDomainsHelp:
    'Defaults include Gmail, Outlook, Yahoo Mail, iCloud Mail, and Proton Mail.',
  advancedWritingInstructionsSummary: 'Advanced writing instructions',
  providerHeading: 'AI model provider',
  providerLead:
    'Choose which AI model provider Simple Words should use to generate refined content.',
  providerBackendLabel: 'Provider',
  providerOpenAICompatible: 'OpenAI (or a compatible endpoint) with API Key',
  providerCodexBackend: 'Codex subscription',
  providerOllama: 'Ollama',
  openAIHeading: 'OpenAI (or a compatible endpoint) with API Key',
  apiKeyLabel: 'API key',
  openAIBaseURLLabel: 'Base URL',
  openAIModelLabel: 'Model',
  reasoningEffortLabel: 'Reasoning effort',
  codexHeading: 'Codex subscription',
  codexLead:
    'Sign in with Codex is the recommended setup path. Simple Words opens Codex sign-in, stores the returned tokens, and refreshes them automatically.',
  codexLeadBeforePath: 'Setup Codex (',
  codexLeadAfterDocsLink: '), and select your Codex auth file, usually at ',
  codexLeadAfterPath: '.',
  recommendedLabel: 'Recommended',
  codexOAuthLoginButton: 'Sign in with Codex',
  codexOAuthLoginAgainButton: 'Sign in again with Codex',
  codexOAuthLoginHelp:
    'Use this first. You should not need to find a local Codex file.',
  codexSignedInStatusLabel: 'Signed in',
  codexOAuthSignedInHelp:
    'You are signed in. Use this only to switch accounts or reconnect Codex.',
  codexAuthFallbackSummary: 'Auth file fallback',
  codexAuthFallbackHelp:
    'If browser sign-in does not work, select the Codex auth file at ~/.codex/auth.json.',
  codexAuthFileLabel: 'Codex auth.json',
  codexAccessTokenLabel: 'Access token',
  codexAccessTokenPlaceholder: 'Imported from auth.json or pasted manually',
  codexRefreshTokenLabel: 'Refresh token',
  codexRefreshTokenPlaceholder: 'Imported from auth.json',
  codexAccountIdLabel: 'ChatGPT account ID',
  codexAccountIdPlaceholder: 'Optional',
  codexBaseURLLabel: 'Base URL',
  codexModelLabel: 'Model',
  ollamaHeading: 'Ollama',
  ollamaBaseURLLabel: 'Base URL',
  ollamaModelLabel: 'Model',
  saveButton: 'Save',
  savedStatus: 'Saved.',
  codexAuthImportedStatus:
    'Imported Codex auth. Click Save to keep these settings.',
  codexOAuthSigningInStatus: 'Opening Codex sign-in...',
  codexOAuthSignedInStatus: 'Signed in to Codex. These settings are saved.',
  codexOAuthLoginFailed: 'Codex sign-in failed',
  codexOAuthHttpFailure: 'Codex sign-in failed with HTTP $1',
  codexOAuthMissingAccessToken:
    'Codex sign-in response was missing access_token',
  codexOAuthStateMismatch: 'Codex sign-in returned an unexpected state',
  codexOAuthMissingCode: 'Codex sign-in did not return an authorization code',
  codexAuthInvalidFile: 'Select a valid Codex auth JSON file',
  codexAuthMissingTokens: 'Codex auth JSON is missing tokens',
  codexAuthMissingAccessToken: 'Codex auth JSON is missing an access token',
  codexRefreshTokenMissing: 'Codex refresh token is not configured',
  codexTokenRefreshHttpFailure:
    'Codex token refresh failed with HTTP $1. Sign in with Codex from Simple Words, or select auth.json as a fallback.',
  codexTokenRefreshMissingAccessToken:
    'Codex token refresh response was missing access_token',
  buttonLabel: 'Simple Words',
  buttonWorkingLabel: 'Refining',
  emptyDraftMessage: 'Write a rough reply first.',
  noReplyMessage: 'No reply returned.',
  loadingPanelTitle: 'Refining draft',
  resultPanelTitle: 'Refined draft',
  messagePanelTitle: "Couldn't refine draft",
  loadingPanelMessage: 'Refining...',
  replaceDraftButton: 'Replace draft',
  openSettingsButton: 'Open settings',
  dismissButton: 'Dismiss',
  panelAriaLabel: 'Simple Words refinement',
  providerSetupRequired:
    'Set up Simple Words first. Choose an AI model provider to start refining drafts.',
  providerRefineFailed:
    'Something went wrong with your AI model provider. Double-check your settings, then try again.',
  providerErrorDetailLabel: 'Provider error:',
  unableToRefineReply: 'Unable to refine reply'
} as const

export type MessageKey = keyof typeof EN_MESSAGES

export function t(key: MessageKey, substitutions?: string | string[]): string {
  try {
    const message = getChromeMessage(key, substitutions)

    return message || applySubstitutions(EN_MESSAGES[key], substitutions)
  } catch {
    return EN_MESSAGES[key]
  }
}

function getChromeMessage(
  key: MessageKey,
  substitutions?: string | string[]
): string {
  return safeChromeCall(() => {
    return typeof chrome !== 'undefined' && chrome.i18n
      ? chrome.i18n.getMessage(key, substitutions)
      : ''
  }, '')
}

function applySubstitutions(
  message: string,
  substitutions?: string | string[]
): string {
  const values = Array.isArray(substitutions)
    ? substitutions
    : substitutions
      ? [substitutions]
      : []

  return values.reduce(
    (result, value, index) => result.replaceAll(`$${index + 1}`, value),
    message
  )
}

export function localizeDocument(root: ParentNode = document): void {
  if (typeof document !== 'undefined') {
    const language = getUILanguage()
    document.documentElement.lang = language
    document.documentElement.dir = isRightToLeftLanguage(language)
      ? 'rtl'
      : 'ltr'
  }

  localizeText(root, 'data-i18n', (element, message) => {
    element.textContent = message
  })
  localizeText(root, 'data-i18n-placeholder', (element, message) => {
    element.setAttribute('placeholder', message)
  })
  localizeText(root, 'data-i18n-aria-label', (element, message) => {
    element.setAttribute('aria-label', message)
  })
}

function getUILanguage(): string {
  return safeChromeCall(() => {
    const language =
      typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
        ? chrome.i18n.getUILanguage()
        : 'en'

    return language.replace('_', '-')
  }, 'en')
}

function isRightToLeftLanguage(language: string): boolean {
  return ['ar', 'fa', 'he', 'ur'].includes(language.split('-')[0])
}

function localizeText(
  root: ParentNode,
  attribute: string,
  apply: (element: HTMLElement, message: string) => void
): void {
  for (const element of root.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
    const key = element.getAttribute(attribute)
    if (isMessageKey(key)) {
      apply(element, t(key))
    }
  }
}

function isMessageKey(key: string | null): key is MessageKey {
  return key !== null && Object.hasOwn(EN_MESSAGES, key)
}
