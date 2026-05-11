/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { DEFAULT_SETTINGS } from '../src/settings'

describe('options page', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.resetModules()
    document.body.innerHTML = ''
  })

  test('localizes static options page text with Chrome i18n messages', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn((key: string) => `translated ${key}`),
        getUILanguage: vi.fn(() => 'es')
      },
      storage: {
        local: {
          get: vi.fn(async () => DEFAULT_SETTINGS),
          set: vi.fn(async () => undefined)
        }
      }
    })

    await import('../src/options')
    await Promise.resolve()

    expect(document.documentElement.lang).toBe('es')
    expect(
      document.querySelector('[data-i18n="saveButton"]')?.textContent
    ).toBe('translated saveButton')
    expect(
      document
        .querySelector('[data-i18n-placeholder="optionalPlaceholder"]')
        ?.getAttribute('placeholder')
    ).toBe('translated optionalPlaceholder')
  })

  test('restores and saves the configured system prompt', async () => {
    document.body.innerHTML = `
      <select id="provider"><option value="openai">OpenAI</option></select>
      <input id="openaiApiKey" />
      <input id="openaiBaseURL" />
      <input id="openaiModel" />
      <select id="openaiReasoningEffort"><option value="none">none</option></select>
      <input id="codexAuthFile" type="file" />
      <input id="codexAccessToken" />
      <input id="codexRefreshToken" />
      <input id="codexAccountId" />
      <input id="codexBaseURL" />
      <input id="codexModel" />
      <select id="codexReasoningEffort"><option value="none">none</option></select>
      <input id="ollamaBaseURL" />
      <input id="ollamaModel" />
      <input id="myName" />
      <textarea id="systemPrompt"></textarea>
      <section data-provider-section="openai"></section>
      <button id="save" type="button">Save</button>
      <p id="status" role="status"></p>
    `
    const set = vi.fn(async () => undefined)

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async () => ({
            ...DEFAULT_SETTINGS,
            myName: 'Kun Chen',
            systemPrompt: 'Keep it short and warm.'
          })),
          set
        }
      }
    })

    await import('../src/options')
    await Promise.resolve()
    await Promise.resolve()

    const systemPrompt = document.getElementById(
      'systemPrompt'
    ) as HTMLTextAreaElement
    const myName = document.getElementById('myName') as HTMLInputElement
    expect(systemPrompt.value).toBe('Keep it short and warm.')
    expect(myName.value).toBe('Kun Chen')

    systemPrompt.value = 'Use plain language.'
    myName.value = 'Kunchenguid'
    document.getElementById('save')?.click()
    await Promise.resolve()

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        myName: 'Kunchenguid',
        systemPrompt: 'Use plain language.'
      })
    )
  })

  test('shows writing instructions before provider-specific settings', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const systemPrompt = document.getElementById('systemPrompt')
    const provider = document.getElementById('provider')
    expect(systemPrompt).not.toBeNull()
    expect(provider).not.toBeNull()
    expect(systemPrompt?.compareDocumentPosition(provider as HTMLElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  test('shows save status inline to the right of the save button', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const save = document.getElementById('save')
    const status = document.getElementById('status')
    expect(save?.parentElement?.classList.contains('save-row')).toBe(true)
    expect(status?.parentElement).toBe(save?.parentElement)
    expect(save?.nextElementSibling).toBe(status)
  })
})
