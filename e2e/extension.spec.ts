import {
  test,
  expect,
  chromium,
  type BrowserContext,
  type Page
} from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const refinedReply = [
  'Hello,',
  '',
  'Thanks for your note. This works for me.',
  '',
  'Best,'
].join('\n')

test('refines and replaces a Gmail-like contenteditable draft', async () => {
  const app = await startFixtureServer()
  const extensionPath = path.join(process.cwd(), 'extension')
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'simplewords-e2e-'))
  let context: BrowserContext | undefined

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    })

    await configureExtension(context, app.baseURL)

    const page = await context.newPage()
    await page.goto(`${app.baseURL}/gmail-like`)
    await page.locator('#editor').click()
    await expect(page.locator('#simplewords-button')).toBeVisible()

    await page.locator('#simplewords-button').click()
    await expect(page.locator('#simplewords-panel')).toContainText(
      'Replace draft'
    )

    await page.getByRole('button', { name: 'Replace draft' }).click()
    await expect(page.locator('#simplewords-panel')).toBeHidden()
    await expect(page.locator('#editor')).toContainText('Thanks for your note')

    const events = await page.evaluate(() => window.__simpleWordsEvents)
    expect(
      events.some(
        (event) =>
          event.type === 'input' &&
          event.isTrusted &&
          event.inputType === 'insertText'
      )
    ).toBe(true)
    expect(events.some((event) => event.type === 'guarded-restore')).toBe(false)
  } finally {
    await context?.close()
    await app.close()
  }
})

test('opens options and explains setup when the provider is not configured', async () => {
  const app = await startFixtureServer()
  const extensionPath = path.join(process.cwd(), 'extension')
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'simplewords-e2e-'))
  let context: BrowserContext | undefined

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    })
    const extensionBaseURL = await extensionBaseUrl(context)
    await closeOptionsPages(context, extensionBaseURL)
    await configureSiteEnablementOnly(context)

    const page = await context.newPage()
    await page.goto(`${app.baseURL}/gmail-like`)
    await page.locator('#editor').click()

    await page.locator('#simplewords-button').click()

    await expect(page.locator('#simplewords-panel')).toContainText(
      'Set up Simple Words first'
    )
    const optionsPage = await waitForOptionsPage(context, extensionBaseURL)
    await expect(optionsPage).toHaveURL(`${extensionBaseURL}options.html`)
  } finally {
    await context?.close()
    await app.close()
  }
})

test('shows provider details without settings action for non-auth errors', async () => {
  const app = await startFixtureServer()
  const extensionPath = path.join(process.cwd(), 'extension')
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'simplewords-e2e-'))
  let context: BrowserContext | undefined

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    })
    const extensionBaseURL = await extensionBaseUrl(context)
    await closeOptionsPages(context, extensionBaseURL)
    await configureExtension(context, app.baseURL, 'gpt-error')

    const page = await context.newPage()
    await page.goto(`${app.baseURL}/gmail-like`)
    await page.locator('#editor').click()
    await page.locator('#simplewords-button').click()

    await expect(page.locator('#simplewords-panel')).toContainText(
      'Something went wrong with your AI model provider',
      { timeout: 15_000 }
    )
    await expect(page.locator('#simplewords-panel')).toContainText(
      'fixture model failure'
    )
    await expect(page.locator('#simplewords-panel')).toContainText(
      "Couldn't refine draft"
    )
    await expect(
      page.getByRole('button', { name: 'Open settings' })
    ).toHaveCount(0)
  } finally {
    await context?.close()
    await app.close()
  }
})

async function configureExtension(
  context: BrowserContext,
  baseURL: string,
  model = 'gpt-test'
): Promise<void> {
  const serviceWorker =
    context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))

  await serviceWorker.evaluate(
    ({ baseURL: apiBaseURL, model: modelName }) => {
      return chrome.storage.local.set({
        provider: 'openai',
        openaiApiKey: 'e2e-key',
        openaiBaseURL: `${apiBaseURL}/v1`,
        openaiModel: modelName,
        openaiReasoningEffort: 'none',
        enabledDomains: ['127.0.0.1'],
        systemPrompt: 'Return a concise polished email reply.'
      })
    },
    { baseURL, model }
  )
}

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

async function extensionBaseUrl(context: BrowserContext): Promise<string> {
  const serviceWorker =
    context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  return new URL('/', serviceWorker.url()).href
}

async function closeOptionsPages(
  context: BrowserContext,
  extensionBaseURL: string
): Promise<void> {
  await waitForOptionsPage(context, extensionBaseURL, 1_000).catch(() => null)
  const pages = context.pages()
  const optionsPages = pages.filter(
    (page) => page.url() === `${extensionBaseURL}options.html`
  )

  if (optionsPages.length === pages.length) {
    await context.newPage()
  }

  await Promise.all(optionsPages.map((page) => page.close()))
}

async function waitForOptionsPage(
  context: BrowserContext,
  extensionBaseURL: string,
  timeout = 5_000
): Promise<Page> {
  const url = `${extensionBaseURL}options.html`
  const existingPage = context.pages().find((page) => page.url() === url)
  if (existingPage) {
    return existingPage
  }

  const openedPage = await context.waitForEvent('page', { timeout })
  await openedPage.waitForURL(url, { timeout })
  return openedPage
}

async function startFixtureServer(): Promise<{
  baseURL: string
  close: () => Promise<void>
}> {
  const server: Server = createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders())
      response.end()
      return
    }

    if (request.url === '/v1/chat/completions') {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        const payload = JSON.parse(body) as { model?: string }
        if (payload.model === 'gpt-error') {
          response.writeHead(500, {
            ...corsHeaders(),
            'content-type': 'application/json'
          })
          response.end(
            JSON.stringify({ error: { message: 'fixture model failure' } })
          )
          return
        }

        response.writeHead(200, {
          ...corsHeaders(),
          'content-type': 'application/json'
        })
        response.end(
          JSON.stringify({
            id: 'chatcmpl-e2e',
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'gpt-test',
            choices: [
              {
                index: 0,
                finish_reason: 'stop',
                message: { role: 'assistant', content: refinedReply }
              }
            ],
            usage: {
              prompt_tokens: 1,
              completion_tokens: 1,
              total_tokens: 2
            }
          })
        )
      })
      return
    }

    if (request.url === '/gmail-like') {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(gmailLikePage())
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

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': '*'
  }
}

function gmailLikePage(): string {
  return `<!doctype html>
<html>
  <head>
    <title>Gmail-like editor fixture</title>
    <style>
      body { font: 16px system-ui; margin: 0; min-height: 100vh; }
      main { padding: 32px; }
      .reply-shell { margin-top: 45vh; width: min(900px, calc(100vw - 64px)); }
      #editor {
        border: 1px solid #dadce0;
        border-radius: 8px;
        min-height: 96px;
        padding: 16px;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Gmail-like reply</h1>
      <section class="reply-shell">
        <div
          id="editor"
          contenteditable="true"
          role="textbox"
          aria-label="Message Body"
          g_editable="true"
        >raincheck?</div>
      </section>
    </main>
    <script>
      const editor = document.getElementById('editor')
      let model = editor.textContent
      window.__simpleWordsEvents = []

      function record(event, scope = 'editor') {
        window.__simpleWordsEvents.push({
          scope,
          type: event.type,
          isTrusted: event.isTrusted,
          inputType: event.inputType || null,
          data: event.data || null,
          defaultPrevented: event.defaultPrevented,
          text: editor.textContent,
          html: editor.innerHTML
        })
      }

      editor.addEventListener('beforeinput', (event) => {
        record(event)
        if (event.isTrusted) {
          model = event.data || editor.textContent
        }
      })

      editor.addEventListener('input', (event) => {
        record(event)
        if (!event.isTrusted) {
          setTimeout(() => {
            editor.textContent = model
            window.__simpleWordsEvents.push({
              scope: 'editor',
              type: 'guarded-restore',
              isTrusted: false,
              inputType: null,
              data: null,
              defaultPrevented: false,
              text: editor.textContent,
              html: editor.innerHTML
            })
          }, 0)
          return
        }

        model = editor.textContent
      })

      document.addEventListener('pointerdown', (event) => {
        if (event.target instanceof Element && event.target.closest('#simplewords-panel')) {
          setTimeout(() => record(event, 'simplewords-ui'), 0)
        }
      })

      document.addEventListener('mousedown', (event) => {
        if (event.target instanceof Element && event.target.closest('#simplewords-panel')) {
          setTimeout(() => record(event, 'simplewords-ui'), 0)
        }
      })
    </script>
  </body>
</html>`
}

declare global {
  interface Window {
    __simpleWordsEvents: Array<{
      scope?: string
      type: string
      isTrusted?: boolean
      inputType?: string | null
      data?: string | null
      defaultPrevented?: boolean
      text?: string
      html?: string
    }>
  }
}
