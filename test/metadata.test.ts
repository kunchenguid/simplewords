// @vitest-environment node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

describe('extension metadata', () => {
  test('keeps package and manifest descriptions in sync', () => {
    const manifest = readJson(join('extension', 'manifest.json'))
    const pkg = readJson('package.json')

    expect(manifest.description).toBe(pkg.description)
  })

  test('keeps the manifest description within Chrome limits', () => {
    const manifest = readJson(join('extension', 'manifest.json'))

    expect(manifest.description.length).toBeLessThanOrEqual(132)
  })
})
