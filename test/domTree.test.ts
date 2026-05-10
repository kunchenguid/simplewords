import { describe, expect, test } from 'vitest'
import { serializeVisibleTextTree } from '../src/domTree'

describe('serializeVisibleTextTree', () => {
  test('places the active editor inline in the surrounding text tree', () => {
    document.body.innerHTML = `
      <main>
        <h1>Re: Partnership idea</h1>
        <article>
          <p>Hi Kun, would you be open to a quick call next week?</p>
        </article>
        <section aria-label="Reply composer">
          <div contenteditable="true">not interested</div>
        </section>
      </main>
    `

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLElement
    const result = serializeVisibleTextTree(document.body, editor)

    expect(result).toContain('main')
    expect(result).toContain('h "Re: Partnership idea"')
    expect(result).toContain('article')
    expect(result).toContain(
      'text "Hi Kun, would you be open to a quick call next week?"'
    )
    expect(result).toContain('> editor active contenteditable=true')
    expect(result).toContain('draft "not interested"')
    expect(result.indexOf('article')).toBeLessThan(
      result.indexOf('> editor active contenteditable=true')
    )
  })

  test('removes only confidently irrelevant and hidden content', () => {
    document.body.innerHTML = `
      <main>
        <style>.hidden { display: none; }</style>
        <script>window.secret = "ignore me"</script>
        <p>Visible message</p>
        <p hidden>Hidden message</p>
        <p aria-hidden="true">Aria hidden message</p>
        <button>Archive</button>
        <textarea>rough reply</textarea>
      </main>
    `

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const result = serializeVisibleTextTree(document.body, editor)

    expect(result).toContain('text "Visible message"')
    expect(result).toContain('> editor active')
    expect(result).toContain('draft "rough reply"')
    expect(result).not.toContain('Archive')
    expect(result).not.toContain('ignore me')
    expect(result).not.toContain('Hidden message')
    expect(result).not.toContain('Aria hidden message')
  })

  test('does not duplicate parent text when children already represent it', () => {
    document.body.innerHTML = `
      <main>
        <section>
          <p>Hello there</p>
          <p>Second paragraph</p>
        </section>
        <div contenteditable="true">yes please</div>
      </main>
    `

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLElement
    const result = serializeVisibleTextTree(document.body, editor)

    expect(result.match(/Hello there/g)).toHaveLength(1)
    expect(result.match(/Second paragraph/g)).toHaveLength(1)
  })

  test('removes Simple Words injected UI from the context tree', () => {
    document.body.innerHTML = `
      <main>
        <p>Original email context</p>
        <textarea>rough reply</textarea>
      </main>
      <button id="simplewords-button">Simple Words</button>
      <div id="simplewords-panel">Refining...</div>
    `

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const result = serializeVisibleTextTree(document.body, editor)

    expect(result).toContain('text "Original email context"')
    expect(result).not.toContain('Simple Words')
    expect(result).not.toContain('Refining')
  })

  test('removes generic app chrome roles while preserving message content and the active editor', () => {
    document.body.innerHTML = `
      <header role="banner"><a>Skip to content</a><div>Product logo</div></header>
      <nav><a>Inbox</a><a>Settings</a></nav>
      <main>
        <article>
          <h1>Partnership idea</h1>
          <p>Would you be open to a quick call?</p>
          <a href="https://example.test">Relevant link in message</a>
        </article>
        <form>
          <div role="toolbar"><button>Bold</button><div role="listbox"><div role="option">Sans Serif</div></div></div>
          <button>Send</button>
          <div contenteditable="true">not interested</div>
        </form>
      </main>
    `

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLElement
    const result = serializeVisibleTextTree(document.body, editor)

    expect(result).toContain('h "Partnership idea"')
    expect(result).toContain('text "Would you be open to a quick call?"')
    expect(result).toContain('a "Relevant link in message"')
    expect(result).toContain('> editor active contenteditable=true')
    expect(result).not.toContain('Skip to content')
    expect(result).not.toContain('Product logo')
    expect(result).not.toContain('Inbox')
    expect(result).not.toContain('Settings')
    expect(result).not.toContain('Bold')
    expect(result).not.toContain('Sans Serif')
    expect(result).not.toContain('Send')
  })

  test('collapses wrapper-only div chains without losing structural context', () => {
    document.body.innerHTML = `
      <main>
        <div><div><div><article><p>Hello from the message</p></article></div></div></div>
        <div><div><div contenteditable="true">sounds good</div></div></div>
      </main>
    `

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLElement
    const result = serializeVisibleTextTree(document.body, editor)

    expect(result).toContain(
      'main\n  article\n    text "Hello from the message"'
    )
    expect(result).toContain('  > editor active contenteditable=true')
    expect(result).not.toContain('div\n    div\n      div')
  })
})
