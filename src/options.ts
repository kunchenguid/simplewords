import {
  DEFAULT_SETTINGS,
  normalizeEnabledDomains,
  type Provider,
  type ReasoningEffort,
  type SimpleWordsSettings
} from './settings'
import { parseCodexAuthJson } from './codexAuth'
import { localizeDocument, t } from './i18n'

const fields = {
  provider: document.getElementById('provider') as HTMLSelectElement | null,
  myName: document.getElementById('myName') as HTMLInputElement | null,
  systemPrompt: document.getElementById(
    'systemPrompt'
  ) as HTMLTextAreaElement | null,
  enabledDomains: document.getElementById(
    'enabledDomains'
  ) as HTMLTextAreaElement | null,
  openaiApiKey: document.getElementById(
    'openaiApiKey'
  ) as HTMLInputElement | null,
  openaiBaseURL: document.getElementById(
    'openaiBaseURL'
  ) as HTMLInputElement | null,
  openaiModel: document.getElementById(
    'openaiModel'
  ) as HTMLInputElement | null,
  openaiReasoningEffort: document.getElementById(
    'openaiReasoningEffort'
  ) as HTMLSelectElement | null,
  codexAuthFile: document.getElementById(
    'codexAuthFile'
  ) as HTMLInputElement | null,
  codexOAuthLogin: document.getElementById(
    'codexOAuthLogin'
  ) as HTMLButtonElement | null,
  codexPrimaryAction: document.getElementById(
    'codexPrimaryAction'
  ) as HTMLElement | null,
  codexOAuthHelp: document.getElementById('codexOAuthHelp'),
  codexAccessToken: document.getElementById(
    'codexAccessToken'
  ) as HTMLInputElement | null,
  codexRefreshToken: document.getElementById(
    'codexRefreshToken'
  ) as HTMLInputElement | null,
  codexAccountId: document.getElementById(
    'codexAccountId'
  ) as HTMLInputElement | null,
  codexBaseURL: document.getElementById(
    'codexBaseURL'
  ) as HTMLInputElement | null,
  codexModel: document.getElementById('codexModel') as HTMLInputElement | null,
  codexReasoningEffort: document.getElementById(
    'codexReasoningEffort'
  ) as HTMLSelectElement | null,
  ollamaBaseURL: document.getElementById(
    'ollamaBaseURL'
  ) as HTMLInputElement | null,
  ollamaModel: document.getElementById('ollamaModel') as HTMLInputElement | null
}
const save = document.getElementById('save') as HTMLButtonElement | null
const statusElement = document.getElementById('status')

localizeDocument()
void restoreOptions()

save?.addEventListener('click', () => {
  void saveOptions()
})

fields.provider?.addEventListener('change', () => {
  updateVisibleProviderFields(fields.provider?.value as Provider)
})

fields.codexAuthFile?.addEventListener('change', () => {
  void importCodexAuthFile()
})

fields.codexOAuthLogin?.addEventListener('click', () => {
  void signInWithCodex()
})

async function restoreOptions(): Promise<void> {
  const settings = (await chrome.storage.local.get(
    DEFAULT_SETTINGS
  )) as SimpleWordsSettings

  setValue(fields.provider, settings.provider)
  setValue(fields.myName, settings.myName)
  setValue(fields.systemPrompt, settings.systemPrompt)
  setValue(fields.enabledDomains, settings.enabledDomains.join('\n'))
  setValue(fields.openaiApiKey, settings.openaiApiKey)
  setValue(fields.openaiBaseURL, settings.openaiBaseURL)
  setValue(fields.openaiModel, settings.openaiModel)
  setValue(fields.openaiReasoningEffort, settings.openaiReasoningEffort)
  setValue(fields.codexAccessToken, settings.codexAccessToken)
  setValue(fields.codexRefreshToken, settings.codexRefreshToken)
  setValue(fields.codexAccountId, settings.codexAccountId)
  setValue(fields.codexBaseURL, settings.codexBaseURL)
  setValue(fields.codexModel, settings.codexModel)
  setValue(fields.codexReasoningEffort, settings.codexReasoningEffort)
  setValue(fields.ollamaBaseURL, settings.ollamaBaseURL)
  setValue(fields.ollamaModel, settings.ollamaModel)
  updateVisibleProviderFields(settings.provider)
  updateCodexSignInState(codexHasTokens(settings))
}

async function saveOptions(): Promise<void> {
  if (!statusElement) {
    return
  }

  await chrome.storage.local.set({
    provider: getValue(fields.provider) as Provider,
    myName: getValue(fields.myName),
    systemPrompt:
      getValue(fields.systemPrompt) || DEFAULT_SETTINGS.systemPrompt,
    enabledDomains: normalizeEnabledDomains(
      getValue(fields.enabledDomains).split(/[\r\n,]+/),
      []
    ),
    openaiApiKey: getValue(fields.openaiApiKey),
    openaiBaseURL:
      getValue(fields.openaiBaseURL) || DEFAULT_SETTINGS.openaiBaseURL,
    openaiModel: getValue(fields.openaiModel) || DEFAULT_SETTINGS.openaiModel,
    openaiReasoningEffort: (getValue(fields.openaiReasoningEffort) ||
      DEFAULT_SETTINGS.openaiReasoningEffort) as ReasoningEffort,
    codexAccessToken: getValue(fields.codexAccessToken),
    codexRefreshToken: getValue(fields.codexRefreshToken),
    codexAccountId: getValue(fields.codexAccountId),
    codexBaseURL:
      getValue(fields.codexBaseURL) || DEFAULT_SETTINGS.codexBaseURL,
    codexModel: getValue(fields.codexModel) || DEFAULT_SETTINGS.codexModel,
    codexReasoningEffort: (getValue(fields.codexReasoningEffort) ||
      DEFAULT_SETTINGS.codexReasoningEffort) as ReasoningEffort,
    ollamaBaseURL:
      getValue(fields.ollamaBaseURL) || DEFAULT_SETTINGS.ollamaBaseURL,
    ollamaModel: getValue(fields.ollamaModel) || DEFAULT_SETTINGS.ollamaModel
  } satisfies SimpleWordsSettings)
  statusElement.textContent = t('savedStatus')
  window.setTimeout(() => {
    statusElement.textContent = ''
  }, 1800)
}

function updateVisibleProviderFields(provider: Provider): void {
  for (const section of document.querySelectorAll<HTMLElement>(
    '[data-provider-section]'
  )) {
    section.hidden = section.dataset.providerSection !== provider
  }
}

async function importCodexAuthFile(): Promise<void> {
  const file = fields.codexAuthFile?.files?.[0]
  if (!file) {
    return
  }

  try {
    const auth = parseCodexAuthJson(await file.text())
    setValue(fields.provider, 'codex')
    setValue(fields.codexAccessToken, auth.accessToken)
    setValue(fields.codexRefreshToken, auth.refreshToken)
    setValue(fields.codexAccountId, auth.accountId)
    updateVisibleProviderFields('codex')
    updateCodexSignInState(true)
    if (statusElement) {
      statusElement.textContent = t('codexAuthImportedStatus')
    }
  } catch (error) {
    if (statusElement) {
      statusElement.textContent =
        error instanceof Error ? error.message : t('codexAuthInvalidFile')
    }
  }
}

async function signInWithCodex(): Promise<void> {
  if (statusElement) {
    statusElement.textContent = t('codexOAuthSigningInStatus')
  }
  if (fields.codexOAuthLogin) {
    fields.codexOAuthLogin.disabled = true
  }

  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'simplewords.codexOAuthLogin'
    })) as {
      codexAuth?: {
        accessToken: string
        refreshToken: string
        accountId: string
      }
      error?: string
    }
    if (response.error) {
      throw new Error(response.error)
    }
    if (!response.codexAuth) {
      throw new Error(t('codexOAuthLoginFailed'))
    }

    setValue(fields.provider, 'codex')
    setValue(fields.codexAccessToken, response.codexAuth.accessToken)
    setValue(fields.codexRefreshToken, response.codexAuth.refreshToken)
    setValue(fields.codexAccountId, response.codexAuth.accountId)
    updateVisibleProviderFields('codex')
    updateCodexSignInState(true)
    if (statusElement) {
      statusElement.textContent = t('codexOAuthSignedInStatus')
    }
  } catch (error) {
    if (statusElement) {
      statusElement.textContent =
        error instanceof Error ? error.message : t('codexOAuthLoginFailed')
    }
  } finally {
    if (fields.codexOAuthLogin) {
      fields.codexOAuthLogin.disabled = false
    }
  }
}

function updateCodexSignInState(signedIn: boolean): void {
  if (fields.codexPrimaryAction) {
    fields.codexPrimaryAction.dataset.codexSignedIn = signedIn
      ? 'true'
      : 'false'
  }
  if (fields.codexOAuthLogin) {
    fields.codexOAuthLogin.textContent = signedIn
      ? t('codexOAuthLoginAgainButton')
      : t('codexOAuthLoginButton')
  }
  if (fields.codexOAuthHelp) {
    fields.codexOAuthHelp.textContent = signedIn
      ? t('codexOAuthSignedInHelp')
      : t('codexOAuthLoginHelp')
  }
}

function codexHasTokens(
  settings: Pick<SimpleWordsSettings, 'codexAccessToken' | 'codexRefreshToken'>
): boolean {
  return (
    settings.codexAccessToken.trim().length > 0 &&
    settings.codexRefreshToken.trim().length > 0
  )
}

function getValue(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
): string {
  return field?.value.trim() ?? ''
}

function setValue(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null,
  value: string
): void {
  if (field) {
    field.value = value
  }
}

export {}
