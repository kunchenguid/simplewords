export type Provider = 'openai' | 'codex' | 'ollama'
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh'

export type SimpleWordsSettings = {
  provider: Provider
  openaiApiKey: string
  openaiBaseURL: string
  openaiModel: string
  openaiReasoningEffort: ReasoningEffort
  codexAccessToken: string
  codexRefreshToken: string
  codexAccountId: string
  codexBaseURL: string
  codexModel: string
  codexReasoningEffort: ReasoningEffort
  ollamaBaseURL: string
  ollamaModel: string
}

export const DEFAULT_SETTINGS: SimpleWordsSettings = {
  provider: 'openai',
  openaiApiKey: '',
  openaiBaseURL: 'https://api.openai.com/v1',
  openaiModel: 'gpt-5.5',
  openaiReasoningEffort: 'low',
  codexAccessToken: '',
  codexRefreshToken: '',
  codexAccountId: '',
  codexBaseURL: 'https://chatgpt.com/backend-api/codex',
  codexModel: 'gpt-5.5-fast',
  codexReasoningEffort: 'low',
  ollamaBaseURL: 'http://localhost:11434/v1',
  ollamaModel: 'llama3.2'
}

export function normalizeSettings(
  raw: Partial<SimpleWordsSettings>
): SimpleWordsSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    provider: isProvider(raw.provider)
      ? raw.provider
      : DEFAULT_SETTINGS.provider,
    openaiReasoningEffort: isReasoningEffort(raw.openaiReasoningEffort)
      ? raw.openaiReasoningEffort
      : DEFAULT_SETTINGS.openaiReasoningEffort,
    codexReasoningEffort: isReasoningEffort(raw.codexReasoningEffort)
      ? raw.codexReasoningEffort
      : DEFAULT_SETTINGS.codexReasoningEffort
  }
}

function isProvider(value: unknown): value is Provider {
  return value === 'openai' || value === 'codex' || value === 'ollama'
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return (
    value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'xhigh'
  )
}
