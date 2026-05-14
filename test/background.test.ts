import { afterEach, describe, expect, test, vi } from 'vitest'
import process from 'node:process'
import { DEFAULT_SETTINGS, type SimpleWordsSettings } from '../src/settings'

type RefineRequest = {
  type: 'simplewords.refine'
  draft: string
  contextTree: string
  title: string
  url: string
}

type CodexOAuthLoginRequest = {
  type: 'simplewords.codexOAuthLogin'
}

type RefineResponse = {
  reply?: string
  error?: string
  action?: 'openOptions'
}

type CodexOAuthLoginResponse = {
  codexAuth?: {
    accessToken: string
    refreshToken: string
    accountId: string
  }
  error?: string
}

const refineRequest: RefineRequest = {
  type: 'simplewords.refine',
  draft: 'sounds good',
  contextTree: 'body\n  editor active',
  title: 'Inbox',
  url: 'https://mail.example.test/thread/1'
}

describe('background service worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.doUnmock('../src/llm')
    vi.resetModules()
  })

  test('does not use dynamic import because extension service workers reject it', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(`${process.cwd()}/src/background.ts`, 'utf8')
    )

    expect(source).not.toContain('await import(')
  })

  test('opens the options page after first install', async () => {
    let installedListener:
      | ((details: chrome.runtime.InstalledDetails) => void)
      | undefined
    const openOptionsPage = vi.fn()

    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: vi.fn()
        },
        onInstalled: {
          addListener: vi.fn(
            (listener: (details: chrome.runtime.InstalledDetails) => void) => {
              installedListener = listener
            }
          )
        },
        openOptionsPage
      }
    })

    await import('../src/background')
    installedListener?.({
      reason: 'install'
    } as chrome.runtime.InstalledDetails)

    expect(openOptionsPage).toHaveBeenCalledTimes(1)
  })

  test('does not open the options page after update', async () => {
    let installedListener:
      | ((details: chrome.runtime.InstalledDetails) => void)
      | undefined
    const openOptionsPage = vi.fn()

    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: vi.fn()
        },
        onInstalled: {
          addListener: vi.fn(
            (listener: (details: chrome.runtime.InstalledDetails) => void) => {
              installedListener = listener
            }
          )
        },
        openOptionsPage
      }
    })

    await import('../src/background')
    installedListener?.({ reason: 'update' } as chrome.runtime.InstalledDetails)

    expect(openOptionsPage).not.toHaveBeenCalled()
  })

  test('refreshes an expiring Codex token before refining and persists rotated account ID', async () => {
    const refreshedAccessToken = jwtWithPayload({
      exp: futureExp(),
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'account-new'
      }
    })
    const fetchToken = vi.fn(async () =>
      Response.json({
        access_token: refreshedAccessToken,
        refresh_token: 'refresh-new'
      })
    )
    vi.stubGlobal('fetch', fetchToken)

    const refineWithProvider = vi.fn(async () => 'refined reply')
    vi.doMock('../src/llm', () => ({ refineWithProvider }))

    const chromeApi = installChrome(
      codexSettings({
        codexAccessToken: jwtWithPayload({ exp: 1 }),
        codexRefreshToken: 'refresh-old',
        codexAccountId: 'account-old'
      })
    )

    await import('../src/background')
    const response = await chromeApi.sendRefine()

    expect(response).toEqual({ reply: 'refined reply' })
    expect(fetchToken).toHaveBeenCalledTimes(1)
    expect(chromeApi.storageSet).toHaveBeenCalledWith({
      codexAccessToken: refreshedAccessToken,
      codexRefreshToken: 'refresh-new',
      codexAccountId: 'account-new'
    })
    expect(refineSettingsAt(refineWithProvider, 0)).toMatchObject({
      codexAccessToken: refreshedAccessToken,
      codexRefreshToken: 'refresh-new',
      codexAccountId: 'account-new'
    })
  })

  test('refreshes an undecodable Codex access token before refining', async () => {
    const refreshedAccessToken = jwtWithPayload({ exp: futureExp() })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          access_token: refreshedAccessToken,
          refresh_token: 'refresh-new'
        })
      )
    )

    const refineWithProvider = vi.fn(async () => 'refined reply')
    vi.doMock('../src/llm', () => ({ refineWithProvider }))

    const chromeApi = installChrome(
      codexSettings({
        codexAccessToken: 'not-a-jwt',
        codexRefreshToken: 'refresh-old'
      })
    )

    await import('../src/background')
    await chromeApi.sendRefine()

    expect(refineSettingsAt(refineWithProvider, 0)).toMatchObject({
      codexAccessToken: refreshedAccessToken,
      codexRefreshToken: 'refresh-new'
    })
  })

  test('joins concurrent Codex token refreshes', async () => {
    const refreshedAccessToken = jwtWithPayload({ exp: futureExp() })
    const fetchToken = vi.fn(
      async () =>
        new Promise<Response>((resolve) => {
          window.setTimeout(() => {
            resolve(
              Response.json({
                access_token: refreshedAccessToken,
                refresh_token: 'refresh-new'
              })
            )
          }, 0)
        })
    )
    vi.stubGlobal('fetch', fetchToken)

    const refineWithProvider = vi.fn(async () => 'refined reply')
    vi.doMock('../src/llm', () => ({ refineWithProvider }))

    const chromeApi = installChrome(
      codexSettings({
        codexAccessToken: jwtWithPayload({ exp: 1 }),
        codexRefreshToken: 'refresh-old'
      })
    )

    await import('../src/background')
    await Promise.all([chromeApi.sendRefine(), chromeApi.sendRefine()])

    expect(fetchToken).toHaveBeenCalledTimes(1)
    expect(refineWithProvider).toHaveBeenCalledTimes(2)
    expect(refineSettingsAt(refineWithProvider, 0)).toMatchObject({
      codexAccessToken: refreshedAccessToken,
      codexRefreshToken: 'refresh-new'
    })
    expect(refineSettingsAt(refineWithProvider, 1)).toMatchObject({
      codexAccessToken: refreshedAccessToken,
      codexRefreshToken: 'refresh-new'
    })
  })

  test('refreshes and retries once when Codex refining fails with HTTP 401', async () => {
    const refreshedAccessToken = jwtWithPayload({ exp: futureExp() })
    const fetchToken = vi.fn(async () =>
      Response.json({
        access_token: refreshedAccessToken,
        refresh_token: 'refresh-new'
      })
    )
    vi.stubGlobal('fetch', fetchToken)

    const refineWithProvider = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      )
      .mockResolvedValueOnce('refined reply')
    vi.doMock('../src/llm', () => ({ refineWithProvider }))

    const chromeApi = installChrome(
      codexSettings({
        codexAccessToken: jwtWithPayload({ exp: futureExp() }),
        codexRefreshToken: 'refresh-old'
      })
    )

    await import('../src/background')
    const response = await chromeApi.sendRefine()

    expect(response).toEqual({ reply: 'refined reply' })
    expect(fetchToken).toHaveBeenCalledTimes(1)
    expect(refineWithProvider).toHaveBeenCalledTimes(2)
    expect(refineSettingsAt(refineWithProvider, 1)).toMatchObject({
      codexAccessToken: refreshedAccessToken,
      codexRefreshToken: 'refresh-new'
    })
  })

  test('does not open options for non-auth provider failures', async () => {
    const refineWithProvider = vi.fn(async () => {
      throw Object.assign(new Error('Server error'), { statusCode: 500 })
    })
    vi.doMock('../src/llm', () => ({ refineWithProvider }))

    const chromeApi = installChrome(codexSettings())

    await import('../src/background')
    const response = await chromeApi.sendRefine()

    expect(response.error).toContain('Server error')
    expect(response.action).toBeUndefined()
    expect(chromeApi.openOptionsPage).not.toHaveBeenCalled()
  })

  test('signs in to Codex by intercepting the localhost OAuth callback', async () => {
    const exchangeCodexAuthorizationCode = vi.fn(async () => ({
      accessToken: jwtWithPayload({
        exp: futureExp(),
        'https://api.openai.com/auth': {
          chatgpt_account_id: 'account-new'
        }
      }),
      refreshToken: 'refresh-new'
    }))
    vi.doMock('../src/codexAuth', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/codexAuth')>()
      return {
        ...actual,
        createCodexPkce: vi.fn(async () => ({
          codeVerifier: 'verifier-123',
          codeChallenge: 'challenge-123'
        })),
        createCodexOAuthState: vi.fn(() => 'state-123'),
        buildCodexAuthorizationUrl: vi.fn(
          () => 'https://auth.example.test/login'
        ),
        exchangeCodexAuthorizationCode
      }
    })

    const chromeApi = installChrome(DEFAULT_SETTINGS)

    await import('../src/background')
    const login = chromeApi.sendCodexOAuthLogin()
    await chromeApi.waitForTabUpdateListener()
    chromeApi.sendTabUpdate(
      123,
      'http://localhost:1455/auth/callback?code=authorization-code&state=state-123'
    )
    const response = await login

    expect(response.error).toBeUndefined()
    expect(response.codexAuth).toMatchObject({
      refreshToken: 'refresh-new',
      accountId: 'account-new'
    })
    expect(chromeApi.tabsCreate.mock.calls[0][0]).toEqual({
      active: true,
      url: 'https://auth.example.test/login'
    })
    expect(exchangeCodexAuthorizationCode).toHaveBeenCalledWith({
      code: 'authorization-code',
      redirectUri: 'http://localhost:1455/auth/callback',
      codeVerifier: 'verifier-123'
    })
    expect(chromeApi.storageSet).toHaveBeenCalledWith({
      provider: 'codex',
      codexAccessToken: response.codexAuth?.accessToken,
      codexRefreshToken: 'refresh-new',
      codexAccountId: 'account-new'
    })
    expect(chromeApi.tabsRemove.mock.calls[0][0]).toBe(123)
  })
})

function installChrome(settings: SimpleWordsSettings): {
  openOptionsPage: ReturnType<typeof vi.fn>
  storageSet: ReturnType<typeof vi.fn>
  tabsCreate: ReturnType<typeof vi.fn>
  tabsRemove: ReturnType<typeof vi.fn>
  sendRefine: () => Promise<RefineResponse>
  sendCodexOAuthLogin: () => Promise<CodexOAuthLoginResponse>
  sendTabUpdate: (tabId: number, url: string) => void
  waitForTabUpdateListener: () => Promise<void>
} {
  let messageListener:
    | ((
        message: RefineRequest | CodexOAuthLoginRequest,
        sender: chrome.runtime.MessageSender,
        sendResponse: (
          response: RefineResponse | CodexOAuthLoginResponse
        ) => void
      ) => boolean | undefined)
    | undefined
  let tabUpdatedListener:
    | ((
        tabId: number,
        changeInfo: chrome.tabs.OnUpdatedInfo,
        tab: chrome.tabs.Tab
      ) => void)
    | undefined
  let resolveTabUpdateListener: (() => void) | undefined
  const storedSettings = { ...settings }
  const openOptionsPage = vi.fn()
  const storageSet = vi.fn(async (values: Partial<SimpleWordsSettings>) => {
    Object.assign(storedSettings, values)
  })
  const tabsCreate = vi.fn(async () => ({ id: 123 }))
  const tabsRemove = vi.fn(async () => undefined)

  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn((listener) => {
          messageListener = listener
        })
      },
      onInstalled: {
        addListener: vi.fn()
      },
      openOptionsPage
    },
    storage: {
      local: {
        get: vi.fn(async () => storedSettings),
        set: storageSet
      }
    },
    tabs: {
      create: tabsCreate,
      remove: tabsRemove,
      onUpdated: {
        addListener: vi.fn((listener) => {
          tabUpdatedListener = listener
          resolveTabUpdateListener?.()
        }),
        removeListener: vi.fn((listener) => {
          if (tabUpdatedListener === listener) {
            tabUpdatedListener = undefined
          }
        })
      }
    }
  })

  return {
    openOptionsPage,
    storageSet,
    tabsCreate,
    tabsRemove,
    sendRefine: () =>
      new Promise((resolve) => {
        if (!messageListener) {
          throw new Error('message listener was not installed')
        }
        const result = messageListener(
          refineRequest,
          {} as chrome.runtime.MessageSender,
          resolve
        )
        if (result !== true) {
          resolve({})
        }
      }),
    sendCodexOAuthLogin: () =>
      new Promise((resolve) => {
        if (!messageListener) {
          throw new Error('message listener was not installed')
        }
        const result = messageListener(
          { type: 'simplewords.codexOAuthLogin' },
          {} as chrome.runtime.MessageSender,
          resolve
        )
        if (result !== true) {
          resolve({})
        }
      }),
    sendTabUpdate: (tabId: number, url: string) => {
      tabUpdatedListener?.(
        tabId,
        { url } as chrome.tabs.OnUpdatedInfo,
        { id: tabId, url } as chrome.tabs.Tab
      )
    },
    waitForTabUpdateListener: () => {
      if (tabUpdatedListener) {
        return Promise.resolve()
      }

      return new Promise((resolve) => {
        resolveTabUpdateListener = resolve
      })
    }
  }
}

function codexSettings(
  overrides: Partial<SimpleWordsSettings> = {}
): SimpleWordsSettings {
  return {
    ...DEFAULT_SETTINGS,
    provider: 'codex',
    openaiApiKey: '',
    codexAccessToken: jwtWithPayload({ exp: futureExp() }),
    codexRefreshToken: 'refresh-token',
    ...overrides
  }
}

function refineSettingsAt(
  refineWithProvider: ReturnType<typeof vi.fn>,
  callIndex: number
): SimpleWordsSettings {
  return (
    refineWithProvider.mock.calls as unknown as Array<[SimpleWordsSettings]>
  )[callIndex][0]
}

function jwtWithPayload(payload: unknown): string {
  return [
    base64UrlEncode(JSON.stringify({ alg: 'none' })),
    base64UrlEncode(JSON.stringify(payload)),
    'signature'
  ].join('.')
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 3_600
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
