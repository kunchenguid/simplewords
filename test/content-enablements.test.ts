// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://mail.google.com/mail/u/0/#inbox" }

import { afterEach, describe, expect, test, vi } from 'vitest'

describe('content script site enablement', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('simplewords-button')?.remove()
    document.getElementById('simplewords-panel')?.remove()
    vi.restoreAllMocks()
    vi.resetModules()
    Reflect.deleteProperty(globalThis, 'chrome')
  })

  test('does not show the button before saved enabled domains load', async () => {
    let resolveSettings: (settings: {
      enabledDomains: string[]
    }) => void = () => {}
    Reflect.set(globalThis, 'chrome', {
      storage: {
        local: {
          get: vi.fn(
            () =>
              new Promise((resolve) => {
                resolveSettings = resolve
              })
          )
        },
        onChanged: {
          addListener: vi.fn()
        }
      },
      runtime: {
        sendMessage: vi.fn()
      }
    })

    await import('../src/content')
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    expect(document.getElementById('simplewords-button')).toBeNull()

    resolveSettings({ enabledDomains: [] })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.getElementById('simplewords-button')).toBeNull()
  })
})
