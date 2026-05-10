import { generateText, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import {
  DEFAULT_SETTINGS,
  type Provider,
  type ReasoningEffort,
  type SimpleWordsSettings
} from './settings'

export type { Provider, ReasoningEffort, SimpleWordsSettings }

export type RefineInput = {
  draft: string
  contextTree: string
  title: string
  url: string
}

export { DEFAULT_SETTINGS }

export async function refineWithProvider(
  settings: SimpleWordsSettings,
  input: RefineInput,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  if (settings.provider === 'codex') {
    return refineWithCodex(settings, input, fetchFn)
  }

  const model = createChatModel(settings, fetchFn)
  const result = await generateText({
    model,
    messages: buildChatMessages(settings, input),
    providerOptions:
      settings.provider === 'openai' &&
      settings.openaiReasoningEffort !== 'none'
        ? { openai: { reasoningEffort: settings.openaiReasoningEffort } }
        : undefined
  })

  return result.text.trim()
}

async function refineWithCodex(
  settings: SimpleWordsSettings,
  input: RefineInput,
  fetchFn: typeof fetch
): Promise<string> {
  const prompt = systemPrompt(settings)
  const codexModel = resolveCodexModel(
    settings.codexModel.trim() || DEFAULT_SETTINGS.codexModel
  )
  const provider = createOpenAI({
    name: 'openai-codex',
    baseURL: withoutTrailingSlash(
      settings.codexBaseURL,
      DEFAULT_SETTINGS.codexBaseURL
    ),
    apiKey: settings.codexAccessToken.trim(),
    fetch: createCodexFetch(settings, fetchFn)
  })
  const result = streamText({
    model: provider.responses(codexModel.model),
    system: prompt,
    messages: [{ role: 'user', content: userPrompt(input) }],
    providerOptions: {
      openai: {
        ...(settings.codexReasoningEffort !== 'none'
          ? { reasoningEffort: settings.codexReasoningEffort }
          : {}),
        ...(codexModel.serviceTier
          ? { serviceTier: codexModel.serviceTier }
          : {}),
        store: false,
        instructions: prompt
      }
    }
  })

  await result.consumeStream()
  return (await result.text).trim()
}

function createChatModel(settings: SimpleWordsSettings, fetchFn: typeof fetch) {
  if (settings.provider === 'ollama') {
    const provider = createOpenAI({
      name: 'ollama',
      baseURL: withoutTrailingSlash(
        settings.ollamaBaseURL,
        DEFAULT_SETTINGS.ollamaBaseURL
      ),
      apiKey: 'ollama',
      fetch: fetchFn
    })
    return provider.chat(
      settings.ollamaModel.trim() || DEFAULT_SETTINGS.ollamaModel
    )
  }

  const provider = createOpenAI({
    baseURL: withoutTrailingSlash(
      settings.openaiBaseURL,
      DEFAULT_SETTINGS.openaiBaseURL
    ),
    apiKey: settings.openaiApiKey.trim(),
    fetch: fetchFn
  })
  return provider.chat(
    settings.openaiModel.trim() || DEFAULT_SETTINGS.openaiModel
  )
}

function createCodexFetch(
  settings: SimpleWordsSettings,
  fetchFn: typeof fetch
): typeof fetch {
  return (input, init = {}) => {
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${settings.codexAccessToken.trim()}`)
    const accountId = settings.codexAccountId.trim()
    if (accountId) {
      headers.set('ChatGPT-Account-Id', accountId)
    }
    return fetchFn(input, { ...init, headers })
  }
}

function buildChatMessages(
  settings: SimpleWordsSettings,
  input: RefineInput
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: systemPrompt(settings) },
    { role: 'user', content: userPrompt(input) }
  ]
}

function systemPrompt(settings: SimpleWordsSettings): string {
  const prompt = settings.systemPrompt.trim() || DEFAULT_SETTINGS.systemPrompt
  const name = settings.myName.trim()
  if (!name) {
    return prompt
  }

  return [prompt, '', `The user's name is ${name}.`].join('\n')
}

function userPrompt(input: RefineInput): string {
  return [
    `Page title: ${input.title}`,
    `Page URL: ${input.url}`,
    '',
    'Rough draft:',
    input.draft,
    '',
    'Visible text tree:',
    input.contextTree
  ].join('\n')
}

function resolveCodexModel(requestedModel: string): {
  model: string
  serviceTier?: 'priority'
} {
  if (requestedModel.endsWith('-fast')) {
    return {
      model: requestedModel.slice(0, -'-fast'.length),
      serviceTier: 'priority'
    }
  }

  return { model: requestedModel }
}

function withoutTrailingSlash(value: string, fallback: string): string {
  return (value.trim() || fallback).replace(/\/+$/, '')
}
