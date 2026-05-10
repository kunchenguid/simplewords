import { afterEach, describe, expect, test } from 'vitest'
import '../src/content'

describe('content script button visibility', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('simplewords-button')?.remove()
    document.getElementById('simplewords-panel')?.remove()
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
})
