import {
  DEFAULT_SETTINGS,
  type Provider,
  type ReasoningEffort,
  type SimpleWordsSettings
} from './settings'
import { parseCodexAuthJson } from './codexAuth'

const fields = {
  provider: document.getElementById('provider') as HTMLSelectElement | null,
  myName: document.getElementById('myName') as HTMLInputElement | null,
  systemPrompt: document.getElementById(
    'systemPrompt'
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

async function restoreOptions(): Promise<void> {
  const settings = (await chrome.storage.local.get(
    DEFAULT_SETTINGS
  )) as SimpleWordsSettings

  setValue(fields.provider, settings.provider)
  setValue(fields.myName, settings.myName)
  setValue(fields.systemPrompt, settings.systemPrompt)
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
  statusElement.textContent = 'Saved.'
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
    if (statusElement) {
      statusElement.textContent =
        'Imported Codex auth. Click Save to keep these settings.'
    }
  } catch (error) {
    if (statusElement) {
      statusElement.textContent =
        error instanceof Error
          ? error.message
          : 'Could not import Codex auth file.'
    }
  }
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
