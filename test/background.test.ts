import { afterEach, describe, expect, test, vi } from 'vitest'
import process from 'node:process'

describe('background service worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
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
})
