// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'

const SUPPORTED_LOCALES = [
  'en',
  'es',
  'zh_CN',
  'hi',
  'ar',
  'pt_BR',
  'fr',
  'de',
  'ja',
  'ru'
]

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

describe('extension i18n', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  test('configures the manifest for Chrome locale messages', () => {
    const manifest = readJson(join('extension', 'manifest.json'))

    expect(manifest.default_locale).toBe('en')
    expect(manifest.name).toBe('__MSG_extensionName__')
    expect(manifest.description).toBe('__MSG_extensionDescription__')
  })

  test('ships complete message files for the top supported locales', () => {
    const englishMessages = readJson(
      join('extension', '_locales', 'en', 'messages.json')
    )
    const englishKeys = Object.keys(englishMessages).sort()

    expect(englishKeys.length).toBeGreaterThan(20)

    for (const locale of SUPPORTED_LOCALES) {
      const messagesPath = join(
        'extension',
        '_locales',
        locale,
        'messages.json'
      )
      expect(existsSync(messagesPath), `${locale} messages.json`).toBe(true)

      const messages = readJson(messagesPath)
      expect(Object.keys(messages).sort(), `${locale} message keys`).toEqual(
        englishKeys
      )

      for (const key of englishKeys) {
        expect(messages[key].message, `${locale}.${key}`).toEqual(
          expect.any(String)
        )
        expect(messages[key].message.trim(), `${locale}.${key}`).not.toBe('')
      }
    }
  })

  test('keeps localized extension descriptions within Chrome limits', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const messages = readJson(
        join('extension', '_locales', locale, 'messages.json')
      )

      expect(
        messages.extensionDescription.message.length,
        `${locale} extensionDescription`
      ).toBeLessThanOrEqual(132)
    }
  })

  test('falls back to English when Chrome has no localized message', async () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn(() => '')
      }
    })

    const { t } = await import('../src/i18n')

    expect(t('saveButton')).toBe('Save')
  })

  test('falls back to English when Chrome i18n is invalidated', async () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn(() => {
          throw new Error('Extension context invalidated.')
        })
      }
    })

    const { t } = await import('../src/i18n')

    expect(t('buttonLabel')).toBe('Simple Words')
  })

  test('does not throw when Chrome i18n fails during substitution fallback', async () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn(() => {
          throw new Error('Extension context invalidated.')
        })
      }
    })

    const { t } = await import('../src/i18n')

    expect(t('codexTokenRefreshHttpFailure', '401')).toContain('401')
  })

  test('sets right-to-left direction for Arabic UI language', async () => {
    const documentElement = { dir: '', lang: '' }
    vi.stubGlobal('document', {
      documentElement,
      querySelectorAll: vi.fn(() => [])
    })
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn(() => ''),
        getUILanguage: vi.fn(() => 'ar')
      }
    })

    const { localizeDocument } = await import('../src/i18n')

    localizeDocument()

    expect(documentElement).toMatchObject({ dir: 'rtl', lang: 'ar' })
  })
})
