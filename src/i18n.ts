export const EN_MESSAGES = {
  extensionName: 'Simple Words',
  extensionDescription:
    'Never waste time wordsmithing your replies. Just say what you mean, and let AI help turn it into a respectful draft before you send.',
  optionsTitle: 'Simple Words Options',
  optionsLede:
    'Choose an LLM provider. The extension calls the selected provider directly after you click the Simple Words button.',
  writingInstructionsHeading: 'Writing instructions',
  writingInstructionsLead:
    'This system prompt is sent with every rewrite request. Page text and email content are treated as context, not instructions.',
  myNameLabel: 'My name',
  optionalPlaceholder: 'Optional',
  myNameHelp:
    'Optional. When set, this is included in the rewrite instructions so the model can use it for signatures when appropriate.',
  systemPromptLabel: 'System prompt',
  systemPromptHelp: 'Leave blank to restore the default system prompt.',
  providerHeading: 'Provider',
  providerBackendLabel: 'Backend',
  providerOpenAICompatible: 'OpenAI-compatible',
  providerCodexBackend: 'Codex backend',
  providerOllama: 'Ollama',
  openAIHeading: 'OpenAI-compatible',
  apiKeyLabel: 'API key',
  openAIBaseURLLabel: 'Base URL',
  openAIModelLabel: 'Model',
  reasoningEffortLabel: 'Reasoning effort',
  codexHeading: 'Codex backend',
  codexLeadBeforePath:
    'Chrome extensions cannot silently read Codex CLI auth from disk. Select your Codex CLI auth file, usually ',
  codexLeadAfterPath: ', to import the token.',
  codexAuthFileLabel: 'Codex auth.json',
  codexAccessTokenLabel: 'Access token',
  codexAccessTokenPlaceholder: 'Imported from auth.json or pasted manually',
  codexAccountIdLabel: 'ChatGPT account ID',
  codexAccountIdPlaceholder: 'Optional',
  codexBaseURLLabel: 'Base URL',
  codexModelLabel: 'Model',
  ollamaHeading: 'Ollama',
  ollamaBaseURLLabel: 'Base URL',
  ollamaModelLabel: 'Model',
  saveButton: 'Save',
  privacyFootBefore: 'Calls go directly from your browser to your provider.',
  privacyFootEmphasis: 'Nothing routes through Simple Words.',
  savedStatus: 'Saved.',
  codexAuthImportedStatus:
    'Imported Codex auth. Click Save to keep these settings.',
  codexAuthInvalidFile: 'Select a valid Codex auth JSON file',
  codexAuthMissingTokens: 'Codex auth JSON is missing tokens',
  codexAuthMissingAccessToken: 'Codex auth JSON is missing an access token',
  codexRefreshTokenMissing: 'Codex refresh token is not configured',
  codexTokenRefreshHttpFailure:
    'Codex token refresh failed with HTTP $1. Select auth.json again or sign in with Codex CLI.',
  codexTokenRefreshMissingAccessToken:
    'Codex token refresh response was missing access_token',
  buttonLabel: 'Simple Words',
  buttonWorkingLabel: 'Refining',
  emptyDraftMessage: 'Write a rough reply first.',
  noReplyMessage: 'No reply returned.',
  loadingPanelTitle: 'Refining draft',
  resultPanelTitle: 'Refined draft',
  loadingPanelMessage: 'Refining...',
  replaceDraftButton: 'Replace draft',
  dismissButton: 'Dismiss',
  panelAriaLabel: 'Simple Words refinement',
  unableToRefineReply: 'Unable to refine reply'
} as const

export type MessageKey = keyof typeof EN_MESSAGES

export function t(key: MessageKey, substitutions?: string | string[]): string {
  const message =
    typeof chrome !== 'undefined' && chrome.i18n
      ? chrome.i18n.getMessage(key, substitutions)
      : ''

  return message || applySubstitutions(EN_MESSAGES[key], substitutions)
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
    document.documentElement.lang = getUILanguage()
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
  const language =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : 'en'

  return language.replace('_', '-')
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
