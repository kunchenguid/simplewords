// @vitest-environment node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

describe('extension metadata', () => {
  test('keeps package and manifest descriptions in sync', () => {
    const manifest = readJson(join('extension', 'manifest.json'))
    const pkg = readJson('package.json')
    const messages = readJson(
      join('extension', '_locales', 'en', 'messages.json')
    )

    expect(manifest.description).toBe('__MSG_extensionDescription__')
    expect(messages.extensionDescription.message).toBe(pkg.description)
  })

  test('keeps the manifest description within Chrome limits', () => {
    const messages = readJson(
      join('extension', '_locales', 'en', 'messages.json')
    )

    expect(messages.extensionDescription.message.length).toBeLessThanOrEqual(
      132
    )
  })

  test('does not request the sensitive tabs permission', () => {
    const manifest = readJson(join('extension', 'manifest.json'))

    expect(manifest.permissions).not.toContain('tabs')
  })
})
