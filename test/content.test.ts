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

  test('shows the Simple Words button for a text input only after content is typed', () => {
    document.body.innerHTML = '<input type="text">'

    const editor = document.querySelector('input') as HTMLInputElement
    editor.focus()

    expect(document.getElementById('simplewords-button')).toBeNull()

    editor.value = 'rough reply'
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    editor.value = '   '
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(button.hidden).toBe(true)
  })

  test('ignores input events from editable elements that are not focused', async () => {
    document.body.innerHTML =
      '<textarea>focused draft</textarea><textarea>programmatic draft</textarea>'

    const sendMessage = vi.fn(() => ({ reply: 'polished reply' }))
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage
      }
    })

    const editors = Array.from(document.querySelectorAll('textarea'))
    const focusedEditor = editors[0] as HTMLTextAreaElement
    const programmaticEditor = editors[1] as HTMLTextAreaElement
    focusedEditor.focus()

    programmaticEditor.value = 'programmatic draft updated'
    programmaticEditor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ draft: 'focused draft' })
    )
  })

  test('shows an error and resets the button when extension messaging is unavailable', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'
    Reflect.set(globalThis, 'chrome', {})

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.focus()

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    expect(button.textContent).toContain('Simple Words')
    expect(panel.textContent).toContain('Unable to refine reply')
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
    editor.focus()

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

  test('keeps the panel hidden when the active editor is cleared before refinement completes', async () => {
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
    editor.focus()

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    expect(panel.hidden).toBe(false)

    editor.value = ''
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(button.hidden).toBe(true)
    expect(panel.hidden).toBe(true)

    resolveRefinement({ reply: 'polished reply' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(true)
    expect(panel.hidden).toBe(true)
  })

  test('resets the button when the active editor is cleared during refinement', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => new Promise<{ reply: string }>(() => {}))
      }
    })

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.focus()

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    expect(button.textContent).toContain('Refining')

    editor.value = ''
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))
    editor.value = 'new draft'
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(button.hidden).toBe(false)
    expect(button.textContent).toContain('Simple Words')
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

  test('preserves line breaks when replacing a contenteditable draft', async () => {
    document.body.innerHTML = '<div contenteditable="true">rough reply</div>'

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => ({
          reply: 'Hello Kun,\n\nThanks for sharing this.\nBest,'
        }))
      }
    })

    const editor = document.querySelector('div') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const replace = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Replace draft'
    ) as HTMLButtonElement
    replace.click()

    expect(editor.innerHTML).toBe(
      'Hello Kun,<br><br>Thanks for sharing this.<br>Best,'
    )
  })

  test('reads inserted contenteditable line breaks on the next refinement', async () => {
    document.body.innerHTML = '<div contenteditable="true">rough reply</div>'

    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        reply: 'Hello Kun,\n\nThanks for sharing this.\nBest,'
      })
      .mockResolvedValueOnce({ reply: 'second polished reply' })

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage
      }
    })

    const editor = document.querySelector('div') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const replace = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Replace draft'
    ) as HTMLButtonElement
    replace.click()
    button.click()

    expect(sendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        draft: 'Hello Kun,\n\nThanks for sharing this.\nBest,',
        type: 'simplewords.refine'
      })
    )
  })

  test('reads contenteditable block boundaries as line breaks', async () => {
    document.body.innerHTML =
      '<div contenteditable="true"><div>Hello Kun,</div><div>Thanks for sharing this.</div><p>Best,</p></div>'

    const sendMessage = vi.fn().mockResolvedValue({ reply: 'polished reply' })
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage
      }
    })

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()

    expect(sendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        draft: 'Hello Kun,\nThanks for sharing this.\nBest,',
        type: 'simplewords.refine'
      })
    )
  })
})
