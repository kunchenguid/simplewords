// @vitest-environment node

import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, test } from 'vitest'

const readPngMetadata = (path: string) => {
  const png = readFileSync(path)

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png[25]
  }
}

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

  test('exports Chrome Web Store PNGs at required sizes without alpha', () => {
    const assets = [
      ['chrome-web-store-assets/store-icon-128.png', 128, 128],
      ['chrome-web-store-assets/screenshot-01-reply-faster.png', 1280, 800],
      ['chrome-web-store-assets/screenshot-02-write-rough.png', 1280, 800],
      ['chrome-web-store-assets/screenshot-03-click-button.png', 1280, 800],
      ['chrome-web-store-assets/screenshot-04-refined-draft.png', 1280, 800],
      ['chrome-web-store-assets/screenshot-05-replace-send.png', 1280, 800],
      ['chrome-web-store-assets/small-promo-tile-440x280.png', 440, 280],
      ['chrome-web-store-assets/marquee-promo-tile-1400x560.png', 1400, 560]
    ] as const

    for (const [path, width, height] of assets) {
      expect(readPngMetadata(path)).toEqual({ width, height, colorType: 2 })
    }
  })
})
