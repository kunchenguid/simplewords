import { describe, expect, test } from 'vitest'
import process from 'node:process'

describe('background service worker', () => {
  test('does not use dynamic import because extension service workers reject it', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(`${process.cwd()}/src/background.ts`, 'utf8')
    )

    expect(source).not.toContain('await import(')
  })
})
