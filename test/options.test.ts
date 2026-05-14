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

  test('shows the default Ollama model as the placeholder', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    expect(
      document.getElementById('ollamaModel')?.getAttribute('placeholder')
    ).toBe(DEFAULT_SETTINGS.ollamaModel)
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
      <textarea id="enabledDomains"></textarea>
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
            systemPrompt: 'Keep it short and warm.',
            enabledDomains: ['mail.google.com', 'app.example.com']
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
    const enabledDomains = document.getElementById(
      'enabledDomains'
    ) as HTMLTextAreaElement
    expect(systemPrompt.value).toBe('Keep it short and warm.')
    expect(myName.value).toBe('Kun Chen')
    expect(enabledDomains.value).toBe('mail.google.com\napp.example.com')

    systemPrompt.value = 'Use plain language.'
    myName.value = 'Kunchenguid'
    enabledDomains.value = 'mail.google.com\nCustom.Example.com\n\n'
    document.getElementById('save')?.click()
    await Promise.resolve()

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        myName: 'Kunchenguid',
        systemPrompt: 'Use plain language.',
        enabledDomains: ['mail.google.com', 'custom.example.com']
      })
    )
  })

  test('presents settings as a simple document without tab-like navigation', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    expect(
      document.querySelector('nav[aria-label="Settings sections"]')
    ).toBeNull()

    expect(
      Array.from(document.querySelectorAll<HTMLElement>('[data-step]')).map(
        (section) => section.dataset.step
      )
    ).toEqual(['1', '2', '3'])

    expect(document.querySelector('style')?.textContent).not.toMatch(
      /#(?:model-provider|where-it-appears|writing-style)\s*{[^}]*\border\s*:/
    )
  })

  test('links to Codex setup docs in a new tab', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const link = document.querySelector<HTMLAnchorElement>(
      'a[href="https://developers.openai.com/codex"]'
    )

    expect(link).not.toBeNull()
    expect(link?.target).toBe('_blank')
    expect(link?.rel).toContain('noopener')
    expect(link?.textContent?.trim()).toBe(
      'https://developers.openai.com/codex'
    )
  })

  test('presents Codex sign-in as the primary setup action', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const signIn = document.getElementById('codexOAuthLogin')
    const authFile = document.getElementById('codexAuthFile')
    const fallback = authFile?.closest('details')

    expect(signIn).toBeInstanceOf(HTMLButtonElement)
    expect(signIn?.closest('.codex-primary-action')).not.toBeNull()
    expect(authFile).toBeInstanceOf(HTMLInputElement)
    expect(fallback?.querySelector('summary')?.textContent?.trim()).toContain(
      'Auth file fallback'
    )
    expect(signIn?.compareDocumentPosition(authFile as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(
      document.querySelector('[data-i18n="codexLead"]')?.textContent
    ).not.toContain('auth file')
  })

  test('shows Codex as already signed in when tokens are configured', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async () => ({
            ...DEFAULT_SETTINGS,
            provider: 'codex',
            codexAccessToken: 'access-token',
            codexRefreshToken: 'refresh-token',
            codexAccountId: 'account-123'
          })),
          set: vi.fn(async () => undefined)
        }
      }
    })

    await import('../src/options')
    await Promise.resolve()
    await Promise.resolve()

    expect(document.getElementById('codexConnectionStatus')?.textContent).toBe(
      'Signed in'
    )
    expect(
      document.getElementById('codexOAuthLogin')?.textContent?.trim()
    ).toBe('Sign in again with Codex')
    expect(document.getElementById('codexOAuthHelp')?.textContent).toContain(
      'You are signed in'
    )
  })

  test('shows Codex refresh token as an editable field', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const refreshToken = document.getElementById('codexRefreshToken')
    const label = document.querySelector('label[for="codexRefreshToken"]')

    expect(refreshToken).toBeInstanceOf(HTMLInputElement)
    expect((refreshToken as HTMLInputElement).type).toBe('password')
    expect(label?.getAttribute('data-i18n')).toBe('codexRefreshTokenLabel')
  })

  test('signs in to Codex from the options page and fills token fields', async () => {
    document.body.innerHTML = `
      <select id="provider"><option value="openai">OpenAI</option><option value="codex">Codex</option></select>
      <input id="openaiApiKey" />
      <input id="openaiBaseURL" />
      <input id="openaiModel" />
      <select id="openaiReasoningEffort"><option value="none">none</option></select>
      <input id="codexAuthFile" type="file" />
      <button id="codexOAuthLogin" type="button">Sign in</button>
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
      <textarea id="enabledDomains"></textarea>
      <section data-provider-section="openai"></section>
      <section data-provider-section="codex" hidden></section>
      <button id="save" type="button">Save</button>
      <p id="status" role="status"></p>
    `
    const sendMessage = vi.fn(async () => ({
      codexAuth: {
        accessToken: 'access-new',
        refreshToken: 'refresh-new',
        accountId: 'account-new'
      }
    }))

    vi.stubGlobal('chrome', {
      runtime: { sendMessage },
      storage: {
        local: {
          get: vi.fn(async () => DEFAULT_SETTINGS),
          set: vi.fn(async () => undefined)
        }
      }
    })

    await import('../src/options')
    await Promise.resolve()
    document.getElementById('codexOAuthLogin')?.click()
    await Promise.resolve()

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'simplewords.codexOAuthLogin'
    })
    expect(
      (document.getElementById('provider') as HTMLSelectElement).value
    ).toBe('codex')
    expect(
      (document.getElementById('codexAccessToken') as HTMLInputElement).value
    ).toBe('access-new')
    expect(
      (document.getElementById('codexRefreshToken') as HTMLInputElement).value
    ).toBe('refresh-new')
    expect(
      (document.getElementById('codexAccountId') as HTMLInputElement).value
    ).toBe('account-new')
    expect(document.getElementById('status')?.textContent).toBe(
      'Signed in to Codex. These settings are saved.'
    )
  })

  test('localizes visible step labels', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn((key: string) => `translated ${key}`),
        getUILanguage: vi.fn(() => 'en')
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

    expect(
      Array.from(document.querySelectorAll<HTMLElement>('.step-kicker')).map(
        (label) => label.textContent
      )
    ).toEqual([
      'translated stepOneLabel',
      'translated stepTwoLabel',
      'translated stepThreeLabel'
    ])
  })

  test('only shows the default provider settings before options restore', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const visibleProviderSections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-provider-section]')
    )
      .filter((section) => !section.hidden)
      .map((section) => section.dataset.providerSection)

    expect(visibleProviderSections).toEqual(['openai'])
  })

  test('defines an explicit CSS rule for hidden provider panels', async () => {
    const html = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    expect(html).toContain('[data-provider-section][hidden]')
  })

  test('visually hides inactive provider settings after restore', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async () => ({
            ...DEFAULT_SETTINGS,
            provider: 'codex'
          })),
          set: vi.fn(async () => undefined)
        }
      }
    })

    await import('../src/options')
    await Promise.resolve()
    await Promise.resolve()

    const openai = document.querySelector<HTMLElement>(
      '[data-provider-section="openai"]'
    )
    const codex = document.querySelector<HTMLElement>(
      '[data-provider-section="codex"]'
    )

    expect(openai?.hidden).toBe(true)
    expect(getComputedStyle(openai as HTMLElement).display).toBe('none')
    expect(codex?.hidden).toBe(false)
    expect(getComputedStyle(codex as HTMLElement).display).not.toBe('none')
  })

  test('keeps advanced writing instructions expanded in a disclosure', async () => {
    document.body.innerHTML = await readFile(
      `${process.cwd()}/extension/options.html`,
      'utf8'
    )

    const systemPrompt = document.getElementById('systemPrompt')
    const disclosure = systemPrompt?.closest('details')
    const summary = disclosure?.querySelector('summary')

    expect(disclosure).not.toBeNull()
    expect(disclosure?.open).toBe(true)
    expect(summary?.textContent?.trim()).toContain(
      'Advanced writing instructions'
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
