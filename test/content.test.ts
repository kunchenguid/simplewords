import { afterEach, describe, expect, test, vi } from 'vitest'
import '../src/content'

describe('content script button visibility', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('simplewords-button')?.remove()
    document.getElementById('simplewords-panel')?.remove()
    vi.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'chrome')
  })

  test('hides the Simple Words button when the active editor is hidden', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    editor.hidden = true
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(true)
  })

  test('hides the Simple Words button when the active editor disclosure is closed', async () => {
    document.body.innerHTML =
      '<details open><summary>Reply</summary><textarea>rough reply</textarea></details>'

    const details = document.querySelector('details') as HTMLDetailsElement
    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    details.open = false
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(true)
  })

  test('keeps the panel hidden when the active editor is hidden before refinement completes', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    let resolveRefinement: (response: { reply: string }) => void = () => {}
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(
          () =>
            new Promise<{ reply: string }>((resolve) => {
              resolveRefinement = resolve
            })
        )
      }
    })

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    expect(panel.hidden).toBe(false)

    editor.hidden = true
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(true)
    expect(panel.hidden).toBe(true)

    resolveRefinement({ reply: 'polished reply' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(true)
    expect(panel.hidden).toBe(true)
  })

  test('resets the button when a refinement completes after focus moves to another editor', async () => {
    document.body.innerHTML =
      '<textarea>first draft</textarea><textarea>second draft</textarea>'

    let resolveRefinement: (response: { reply: string }) => void = () => {}
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(
          () =>
            new Promise<{ reply: string }>((resolve) => {
              resolveRefinement = resolve
            })
        )
      }
    })

    const editors = Array.from(document.querySelectorAll('textarea'))
    const firstEditor = editors[0] as HTMLTextAreaElement
    const secondEditor = editors[1] as HTMLTextAreaElement
    firstEditor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    expect(button.textContent).toContain('Refining')

    secondEditor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    resolveRefinement({ reply: 'polished reply' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.textContent).toContain('Simple Words')
  })

  test('ignores an older same-editor refinement after a newer one starts', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    const refinements: Array<(response: { reply: string }) => void> = []
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(
          () =>
            new Promise<{ reply: string }>((resolve) => {
              refinements.push(resolve)
            })
        )
      }
    })

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    button.click()

    refinements[1]?.({ reply: 'newer polished reply' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    expect(panel.textContent).toContain('newer polished reply')
    expect(button.textContent).toContain('Simple Words')

    refinements[0]?.({ reply: 'older polished reply' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(panel.textContent).toContain('newer polished reply')
    expect(panel.textContent).not.toContain('older polished reply')
  })
})
