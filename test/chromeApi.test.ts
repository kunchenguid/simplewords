import { afterEach, describe, expect, test, vi } from 'vitest'

describe('safe Chrome API access', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  test('marks the extension context invalid when a Chrome API throws invalidated context', async () => {
    const { isExtensionContextValid, safeChromeCall } =
      await import('../src/chromeApi')

    const result = safeChromeCall(() => {
      throw new Error('Extension context invalidated.')
    }, 'fallback')

    expect(result).toBe('fallback')
    expect(isExtensionContextValid()).toBe(false)
  })

  test('returns fallback without calling Chrome after context invalidation', async () => {
    const { isExtensionContextValid, safeChromeCall } =
      await import('../src/chromeApi')

    safeChromeCall(() => {
      throw new Error('Extension context invalidated.')
    }, 'first fallback')

    const operation = vi.fn(() => 'value')
    const result = safeChromeCall(operation, 'second fallback')

    expect(result).toBe('second fallback')
    expect(operation).not.toHaveBeenCalled()
    expect(isExtensionContextValid()).toBe(false)
  })

  test('notifies subscribers once when the context is invalidated', async () => {
    const { onExtensionContextInvalidated, safeChromeCall } =
      await import('../src/chromeApi')
    const listener = vi.fn()

    onExtensionContextInvalidated(listener)
    safeChromeCall(() => {
      throw new Error('Extension context invalidated.')
    }, undefined)
    safeChromeCall(() => {
      throw new Error('Extension context invalidated.')
    }, undefined)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('does not invalidate context for ordinary operation errors', async () => {
    const { isExtensionContextValid, safeChromeCall } =
      await import('../src/chromeApi')

    const result = safeChromeCall(() => {
      throw new Error('Network failure')
    }, 'fallback')

    expect(result).toBe('fallback')
    expect(isExtensionContextValid()).toBe(true)
  })
})
