import { afterEach, describe, expect, test, vi } from 'vitest'
import { resetExtensionContextForTests } from '../src/chromeApi'
import '../src/content'

describe('content script button visibility', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('simplewords-button')?.remove()
    document.getElementById('simplewords-panel')?.remove()
    vi.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'chrome')
    resetExtensionContextForTests()
  })

  test('shows the Simple Words button for a focused empty text input', () => {
    document.body.innerHTML = '<input type="text">'

    const editor = document.querySelector('input') as HTMLInputElement
    editor.focus()

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    editor.value = 'rough reply'
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(button.hidden).toBe(false)

    editor.value = '   '
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(button.hidden).toBe(false)
  })

  test('keeps hidden injected UI from being painted by extension display styles', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button>Close</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const close = document.querySelector('button') as HTMLButtonElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    close.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    const style = document.getElementById(
      'simplewords-style'
    ) as HTMLStyleElement
    expect(button.hidden).toBe(true)
    expect(style.textContent).toContain('#simplewords-button[hidden]')
    expect(style.textContent).toContain('display: none !important')
    expect(getComputedStyle(button).display).toBe('none')
  })

  test('uses a smaller centered button for short single-line inputs', () => {
    document.body.innerHTML = '<input type="text" value="subject">'

    const editor = document.querySelector('input') as HTMLInputElement
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
      top: 40,
      left: 20,
      right: 220,
      bottom: 60,
      width: 200,
      height: 20,
      x: 20,
      y: 40,
      toJSON: () => null
    })
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.dataset.size).toBe('small')
    expect(button.style.top).toBe('40px')
    expect(button.style.left).toBe('192px')
    expect(button.innerHTML).toContain('font-size="48"')
  })

  test('moves the Simple Words button away from overlapping page buttons', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button type="button">Send</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const sendButton = document.querySelector('button') as HTMLButtonElement
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 100,
      right: 300,
      bottom: 200,
      width: 200,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => null
    })
    vi.spyOn(sendButton, 'getBoundingClientRect').mockReturnValue({
      top: 160,
      left: 260,
      right: 310,
      bottom: 210,
      width: 50,
      height: 50,
      x: 260,
      y: 160,
      toJSON: () => null
    })

    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.style.top).toBe('108px')
    expect(button.style.left).toBe('268px')
  })

  test('does not avoid invisible page buttons near the editor', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button type="button" style="visibility: hidden">Send</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const sendButton = document.querySelector('button') as HTMLButtonElement
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 100,
      right: 300,
      bottom: 200,
      width: 200,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => null
    })
    vi.spyOn(sendButton, 'getBoundingClientRect').mockReturnValue({
      top: 160,
      left: 260,
      right: 310,
      bottom: 210,
      width: 50,
      height: 50,
      x: 260,
      y: 160,
      toJSON: () => null
    })

    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.style.top).toBe('168px')
    expect(button.style.left).toBe('268px')
  })

  test('does not avoid broad tabindex containers near the editor', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><div tabindex="0">Focusable wrapper</div>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const focusableWrapper = document.querySelector('div') as HTMLDivElement
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 100,
      right: 300,
      bottom: 200,
      width: 200,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => null
    })
    vi.spyOn(focusableWrapper, 'getBoundingClientRect').mockReturnValue({
      top: 160,
      left: 260,
      right: 310,
      bottom: 210,
      width: 50,
      height: 50,
      x: 260,
      y: 160,
      toJSON: () => null
    })

    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.style.top).toBe('168px')
    expect(button.style.left).toBe('268px')
  })

  test('uses the editable root when input events come from a contenteditable child', () => {
    document.body.innerHTML =
      '<div contenteditable="true"><div data-child>rough reply</div></div>'

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLDivElement
    const child = document.querySelector('[data-child]') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    Object.defineProperty(child, 'isContentEditable', { value: true })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      left: 30,
      right: 330,
      bottom: 120,
      width: 300,
      height: 100,
      x: 30,
      y: 20,
      toJSON: () => null
    })

    child.dispatchEvent(new InputEvent('input', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)
    expect(editor.getBoundingClientRect).toHaveBeenCalled()
  })

  test('shows the Simple Words button when a visible editor overrides a hidden ancestor visibility', () => {
    document.body.innerHTML =
      '<div style="visibility: hidden"><div contenteditable="true" style="visibility: visible">rough reply</div></div>'

    const editor = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
      top: 40,
      left: 40,
      right: 340,
      bottom: 140,
      width: 300,
      height: 100,
      x: 40,
      y: 40,
      toJSON: () => null
    })

    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)
  })

  test('hides the Simple Words button when focus leaves the active editor', async () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button>Send</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const send = document.querySelector('button') as HTMLButtonElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(send)
    editor.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: send })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(true)
  })

  test('hides the Simple Words button when focus moves directly to a non-editor control', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button aria-label="Discard draft">Discard</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const discard = document.querySelector('button') as HTMLButtonElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(discard)
    discard.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    expect(button.hidden).toBe(true)
  })

  test('hides the Simple Words button when clicking outside while focus still reports the editor', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button>Close</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const close = document.querySelector('button') as HTMLButtonElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    close.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(button.hidden).toBe(true)
  })

  test('does not re-show the Simple Words button for a closing editor after outside click', () => {
    document.body.innerHTML =
      '<textarea>rough reply</textarea><button>Discard</button>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    const discard = document.querySelector('button') as HTMLButtonElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    discard.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    document.dispatchEvent(new Event('selectionchange'))

    expect(button.hidden).toBe(true)
  })

  test('hides the Simple Words button when the active editor is no longer focused during refresh', () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body)
    window.dispatchEvent(new Event('scroll'))

    expect(button.hidden).toBe(true)
  })

  test('shows the Simple Words button when clicking a focused editor after stale hide', () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.hidden).toBe(false)

    const activeElement = vi.spyOn(document, 'activeElement', 'get')
    activeElement.mockReturnValue(document.body)
    window.dispatchEvent(new Event('scroll'))
    expect(button.hidden).toBe(true)

    activeElement.mockReturnValue(editor)
    editor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(button.hidden).toBe(false)
  })

  test('repositions the Simple Words button when an editor scroll container scrolls', () => {
    document.body.innerHTML =
      '<div data-scroll><textarea>rough reply</textarea></div>'

    const scrollContainer = document.querySelector(
      '[data-scroll]'
    ) as HTMLDivElement
    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    let bottom = 240
    vi.spyOn(editor, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          top: bottom - 60,
          left: 40,
          right: 340,
          bottom,
          width: 300,
          height: 60,
          x: 40,
          y: bottom - 60,
          toJSON: () => null
        }) as DOMRect
    )
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800
    })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)

    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    expect(button.style.top).toBe('208px')

    bottom = 180
    scrollContainer.dispatchEvent(new Event('scroll'))

    expect(button.style.top).toBe('148px')
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

  test('shows Chrome messaging errors when the background receiver is unavailable', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi
          .fn()
          .mockRejectedValue(
            new Error(
              'Could not establish connection. Receiving end does not exist.'
            )
          )
      }
    })

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.focus()

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    expect(button.textContent).toContain('Simple Words')
    expect(panel.textContent).toContain(
      'Could not establish connection. Receiving end does not exist.'
    )
  })

  test('disables the stale content script when extension messaging is invalidated', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'
    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => {
          throw new Error('Extension context invalidated')
        })
      }
    })

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    editor.focus()

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.textContent).toContain('Simple Words')
    expect(button.hidden).toBe(true)
  })

  test('hides the Simple Words button when the active editor is hidden', async () => {
    document.body.innerHTML = '<textarea>rough reply</textarea>'

    const editor = document.querySelector('textarea') as HTMLTextAreaElement
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
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

  test('keeps the panel hidden and button visible when the active editor is cleared before refinement completes', async () => {
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

    expect(button.hidden).toBe(false)
    expect(button.textContent).toContain('Simple Words')
    expect(panel.hidden).toBe(true)

    resolveRefinement({ reply: 'polished reply' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(button.hidden).toBe(false)
    expect(panel.hidden).toBe(true)
  })

  test('resets the button and keeps it visible when the active editor is cleared during refinement', async () => {
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
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(firstEditor)
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
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
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
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
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

  test('uses native editing commands when replacing a contenteditable draft', async () => {
    document.body.innerHTML = '<div contenteditable="true">rough reply</div>'

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => ({ reply: 'polished reply' }))
      }
    })

    const editor = document.querySelector('div') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    const inputEvents: string[] = []
    editor.addEventListener('input', (event) => {
      inputEvents.push((event as InputEvent).inputType)
    })
    const changeEvents: Event[] = []
    editor.addEventListener('change', (event) => {
      changeEvents.push(event)
    })
    const execCommand = vi.fn((command: string, _showUI: boolean, value) => {
      if (command !== 'insertText') {
        return false
      }

      editor.textContent = String(value)
      return true
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    })
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

    expect(execCommand).toHaveBeenCalledWith(
      'insertText',
      false,
      'polished reply'
    )
    expect(editor.textContent).toBe('polished reply')
    expect(inputEvents).not.toContain('insertReplacementText')
    expect(changeEvents).toHaveLength(1)
  })

  test('does not fall back after Gmail-style native replacement normalizes line breaks', async () => {
    document.body.innerHTML = '<div contenteditable="true">rough reply</div>'

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => ({
          reply: 'Hello,\n\nThanks for your note.\n\nBest,'
        }))
      }
    })

    const editor = document.querySelector('div') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    const inputEvents: string[] = []
    editor.addEventListener('input', (event) => {
      inputEvents.push((event as InputEvent).inputType)
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn((command: string) => {
        if (command !== 'insertText') {
          return false
        }

        editor.innerHTML =
          'Hello,<div><br></div><div>Thanks for your note.</div><div><br></div><div>Best,</div>'
        return true
      })
    })
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
      'Hello,<div><br></div><div>Thanks for your note.</div><div><br></div><div>Best,</div>'
    )
    expect(inputEvents).not.toContain('insertReplacementText')
  })

  test('keeps the result panel clickable when injected UI focusout has no related target', async () => {
    document.body.innerHTML = '<div contenteditable="true">rough reply</div>'

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => ({ reply: 'polished reply' }))
      }
    })

    const editor = document.querySelector('div') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    const replace = Array.from(panel.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Replace draft'
    ) as HTMLButtonElement

    replace.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body)
    editor.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(panel.hidden).toBe(false)
  })

  test('prevents injected UI mouse down from stealing editor focus', async () => {
    document.body.innerHTML = '<div contenteditable="true">rough reply</div>'

    Reflect.set(globalThis, 'chrome', {
      runtime: {
        sendMessage: vi.fn(() => ({ reply: 'polished reply' }))
      }
    })

    const editor = document.querySelector('div') as HTMLDivElement
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const button = document.getElementById(
      'simplewords-button'
    ) as HTMLButtonElement
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const panel = document.getElementById('simplewords-panel') as HTMLDivElement
    const replace = Array.from(panel.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Replace draft'
    ) as HTMLButtonElement
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    })

    replace.dispatchEvent(mouseDown)

    expect(mouseDown.defaultPrevented).toBe(true)
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
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(editor)
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
