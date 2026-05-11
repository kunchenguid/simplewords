// @vitest-environment node

import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, test } from 'vitest'

describe('Chrome Web Store assets', () => {
  test('sizes the render helper to the selected SVG', async () => {
    const renderHtml = readFileSync(
      'chrome-web-store-assets/sources/render.html',
      'utf8'
    )
    const marqueeSvg = readFileSync(
      'chrome-web-store-assets/sources/marquee-promo-tile-1400x560.svg',
      'utf8'
    )

    const dom = new JSDOM(renderHtml, {
      beforeParse(window) {
        window.fetch = async () => new Response(marqueeSvg)
      },
      runScripts: 'dangerously',
      url: 'https://example.test/render.html?file=marquee-promo-tile-1400x560'
    })

    await new Promise((resolve) => dom.window.setTimeout(resolve, 0))

    const iframe = dom.window.document.getElementById('asset')

    expect(dom.window.document.documentElement.style.width).toBe('1400px')
    expect(dom.window.document.body.style.width).toBe('1400px')
    expect(iframe?.style.width).toBe('1400px')
    expect(dom.window.document.documentElement.style.height).toBe('560px')
    expect(dom.window.document.body.style.height).toBe('560px')
    expect(iframe?.style.height).toBe('560px')
  })

  test('ignores macOS Finder metadata', () => {
    const gitignore = readFileSync('.gitignore', 'utf8')

    expect(gitignore.split('\n')).toContain('.DS_Store')
  })
})
