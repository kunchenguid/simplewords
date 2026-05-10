import { serializeVisibleTextTree } from './domTree'
import { panelPositionAboveButton } from './uiPosition'

const BUTTON_ID = 'simplewords-button'
const PANEL_ID = 'simplewords-panel'
const MAX_CONTEXT_CHARS = 30_000

let activeEditor: HTMLElement | null = null

document.addEventListener('focusin', (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement) || !isEditableElement(target)) {
    return
  }

  activeEditor = target
  showButton(target)
})

document.addEventListener('selectionchange', () => {
  const element = document.activeElement
  if (element instanceof HTMLElement && isEditableElement(element)) {
    activeEditor = element
    showButton(element)
  }
})

window.addEventListener(
  'scroll',
  () => {
    if (activeEditor) {
      positionButton(activeEditor)
    }
  },
  { passive: true }
)

window.addEventListener('resize', () => {
  if (activeEditor) {
    positionButton(activeEditor)
  }
})

function showButton(editor: HTMLElement): void {
  const button = getOrCreateButton()
  button.hidden = false
  positionButton(editor)
}

function getOrCreateButton(): HTMLButtonElement {
  const existing = document.getElementById(BUTTON_ID)
  if (existing instanceof HTMLButtonElement) {
    return existing
  }

  const button = document.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.textContent = 'Simple Words'
  Object.assign(button.style, {
    position: 'fixed',
    zIndex: '2147483647',
    border: '0',
    borderRadius: '999px',
    padding: '8px 12px',
    background: '#172033',
    color: '#ffffff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.22)',
    cursor: 'pointer',
    font: '600 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  })
  button.addEventListener('mousedown', (event) => event.preventDefault())
  button.addEventListener('click', () => {
    void refineActiveEditor()
  })
  document.documentElement.append(button)
  return button
}

function positionButton(editor: HTMLElement): void {
  const button = getOrCreateButton()
  const rect = editor.getBoundingClientRect()
  const top = Math.max(8, rect.bottom + 8)
  const left = Math.min(
    window.innerWidth - button.offsetWidth - 8,
    Math.max(8, rect.right - button.offsetWidth)
  )
  button.style.top = `${top}px`
  button.style.left = `${left}px`
}

async function refineActiveEditor(): Promise<void> {
  const editor = activeEditor
  if (!editor) {
    return
  }

  const draft = getEditorText(editor)
  if (!draft) {
    showPanel(editor, 'Write a rough reply first.', null)
    return
  }

  showPanel(editor, 'Refining...', null)

  const contextTree = serializeVisibleTextTree(document.body, editor).slice(
    0,
    MAX_CONTEXT_CHARS
  )
  const response = (await chrome.runtime.sendMessage({
    type: 'simplewords.refine',
    draft,
    contextTree,
    title: document.title,
    url: location.href
  })) as { reply?: string; error?: string }

  if (response.error || !response.reply) {
    showPanel(editor, response.error ?? 'No reply returned.', null)
    return
  }

  showPanel(editor, response.reply, response.reply)
}

function showPanel(
  editor: HTMLElement,
  message: string,
  replacement: string | null
): void {
  const panel = getOrCreatePanel()
  panel.replaceChildren()

  const text = document.createElement('div')
  text.textContent = message
  text.style.whiteSpace = 'pre-wrap'
  text.style.marginBottom = replacement ? '12px' : '0'
  panel.append(text)

  if (replacement) {
    const actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.gap = '8px'

    const replace = document.createElement('button')
    replace.type = 'button'
    replace.textContent = 'Replace draft'
    stylePanelButton(replace, true)
    replace.addEventListener('click', () => {
      setEditorText(editor, replacement)
      panel.hidden = true
      editor.focus()
    })

    const dismiss = document.createElement('button')
    dismiss.type = 'button'
    dismiss.textContent = 'Dismiss'
    stylePanelButton(dismiss, false)
    dismiss.addEventListener('click', () => {
      panel.hidden = true
      editor.focus()
    })

    actions.append(replace, dismiss)
    panel.append(actions)
  }

  panel.hidden = false
  const button = getOrCreateButton()
  const position = panelPositionAboveButton({
    buttonRect: button.getBoundingClientRect(),
    panelSize: { width: panel.offsetWidth, height: panel.offsetHeight },
    viewportSize: { width: window.innerWidth, height: window.innerHeight }
  })
  panel.style.top = `${position.top}px`
  panel.style.left = `${position.left}px`
}

function getOrCreatePanel(): HTMLDivElement {
  const existing = document.getElementById(PANEL_ID)
  if (existing instanceof HTMLDivElement) {
    return existing
  }

  const panel = document.createElement('div')
  panel.id = PANEL_ID
  Object.assign(panel.style, {
    position: 'fixed',
    zIndex: '2147483647',
    maxWidth: '420px',
    minWidth: '260px',
    padding: '14px',
    borderRadius: '14px',
    background: '#ffffff',
    color: '#172033',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.28)',
    font: '14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  })
  document.documentElement.append(panel)
  return panel
}

function stylePanelButton(button: HTMLButtonElement, primary: boolean): void {
  Object.assign(button.style, {
    border: primary ? '0' : '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    background: primary ? '#172033' : '#ffffff',
    color: primary ? '#ffffff' : '#172033',
    cursor: 'pointer',
    font: '600 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  })
}

function isEditableElement(element: HTMLElement): boolean {
  if (element.isContentEditable) {
    return true
  }

  if (element instanceof HTMLTextAreaElement) {
    return true
  }

  if (!(element instanceof HTMLInputElement)) {
    return false
  }

  return ['email', 'search', 'text', 'url'].includes(element.type)
}

function getEditorText(element: HTMLElement): string {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    return element.value.trim()
  }

  return (element.textContent ?? '').trim()
}

function setEditorText(element: HTMLElement, value: string): void {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    element.value = value
  } else {
    element.textContent = value
  }

  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertReplacementText',
      data: value
    })
  )
  element.dispatchEvent(new Event('change', { bubbles: true }))
}
