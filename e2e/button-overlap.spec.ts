import { test, expect, chromium, type BrowserContext } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const evidenceDir = path.join(process.cwd(), 'test-results', 'button-overlap')

test('places the Simple Words button away from page buttons but not broad tabindex containers', async () => {
  const app = await startFixtureServer()
  const extensionPath = path.join(process.cwd(), 'extension')
  const userDataDir = await mkdtemp(
    path.join(tmpdir(), 'simplewords-overlap-e2e-')
  )
  let context: BrowserContext | undefined

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    })

    await configureSiteEnablementOnly(context)
    await mkdir(evidenceDir, { recursive: true })

    const page = await context.newPage()
    await page.setViewportSize({ width: 640, height: 480 })

    await page.goto(`${app.baseURL}/button-overlap`)
    await page.locator('#editor').click()
    await expect(page.locator('#simplewords-button')).toBeVisible()
    const buttonControlEvidence = await page.evaluate(measurePlacement)
    expect(buttonControlEvidence.overlapsAvoidTarget).toBe(false)
    expect(buttonControlEvidence.simpleWordsButton.top).toBeLessThan(
      buttonControlEvidence.editor.bottom - 30
    )
    await page.screenshot({
      path: path.join(evidenceDir, 'button-control-avoided.png'),
      fullPage: true
    })

    await page.goto(`${app.baseURL}/tabindex-nearby`)
    await page.locator('#editor').click()
    await expect(page.locator('#simplewords-button')).toBeVisible()
    const tabindexEvidence = await page.evaluate(measurePlacement)
    expect(tabindexEvidence.overlapsAvoidTarget).toBe(true)
    expect(tabindexEvidence.simpleWordsButton.top).toBeGreaterThan(
      tabindexEvidence.editor.bottom - 40
    )
    await page.screenshot({
      path: path.join(evidenceDir, 'tabindex-container-not-avoided.png'),
      fullPage: true
    })

    await writeFile(
      path.join(evidenceDir, 'placement-evidence.json'),
      `${JSON.stringify({ buttonControlEvidence, tabindexEvidence }, null, 2)}\n`
    )
  } finally {
    await context?.close()
    await app.close()
  }
})

async function configureSiteEnablementOnly(
  context: BrowserContext
): Promise<void> {
  const serviceWorker =
    context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))

  await serviceWorker.evaluate(() => {
    return chrome.storage.local.set({
      enabledDomains: ['127.0.0.1']
    })
  })
}

async function startFixtureServer(): Promise<{
  baseURL: string
  close: () => Promise<void>
}> {
  const server: Server = createServer((request, response) => {
    if (request.url === '/button-overlap') {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(
        fixturePage('<button id="avoid-target" type="button">Send</button>')
      )
      return
    }

    if (request.url === '/tabindex-nearby') {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(
        fixturePage(
          '<div id="avoid-target" tabindex="0">Focusable wrapper</div>'
        )
      )
      return
    }

    response.writeHead(404, { 'content-type': 'text/plain' })
    response.end('not found')
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Unable to start E2E fixture server')
  }

  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
  }
}

function fixturePage(avoidTarget: string): string {
  return `<!doctype html>
<html>
  <head>
    <title>Simple Words button overlap fixture</title>
    <style>
      body { font: 16px system-ui; margin: 0; min-height: 100vh; }
      main { padding: 80px; }
      .compose { position: relative; width: 260px; }
      #editor {
        border: 1px solid #999;
        border-radius: 8px;
        box-sizing: border-box;
        height: 100px;
        padding: 12px;
        width: 200px;
      }
      #avoid-target {
        align-items: center;
        background: #1a73e8;
        border: 0;
        border-radius: 999px;
        box-sizing: border-box;
        color: white;
        display: flex;
        height: 50px;
        justify-content: center;
        left: 160px;
        position: absolute;
        top: 60px;
        width: 50px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Reply composer</h1>
      <div class="compose">
        <textarea id="editor">rough reply</textarea>
        ${avoidTarget}
      </div>
    </main>
  </body>
</html>`
}

function measurePlacement(): {
  editor: PlainRect
  avoidTarget: PlainRect
  simpleWordsButton: PlainRect
  overlapsAvoidTarget: boolean
} {
  const plainRect = (element: HTMLElement | null): PlainRect => {
    if (!element) {
      throw new Error('Expected element to exist')
    }

    const rect = element.getBoundingClientRect()
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }
  const rectsOverlap = (a: PlainRect, b: PlainRect): boolean => {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    )
  }

  const editor = plainRect(document.getElementById('editor'))
  const avoidTarget = plainRect(document.getElementById('avoid-target'))
  const simpleWordsButton = plainRect(
    document.getElementById('simplewords-button')
  )

  return {
    editor,
    avoidTarget,
    simpleWordsButton,
    overlapsAvoidTarget: rectsOverlap(simpleWordsButton, avoidTarget)
  }
}

interface PlainRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}
