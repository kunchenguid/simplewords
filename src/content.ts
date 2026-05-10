import { serializeVisibleTextTree } from './domTree'
import { panelPositionAboveButton } from './uiPosition'

const BUTTON_ID = 'simplewords-button'
const PANEL_ID = 'simplewords-panel'
const STYLE_ID = 'simplewords-style'
const MAX_CONTEXT_CHARS = 30_000

const SPARKLES_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>`

const LOADER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`

const STYLE_CSS = `
#${BUTTON_ID} {
  align-items: center;
  background: #0E1525;
  border: 0;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(14, 21, 37, 0.22);
  color: #FAF8F5;
  cursor: pointer;
  display: inline-flex;
  font: 600 13px/1 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  gap: 7px;
  letter-spacing: -0.005em;
  padding: 8px 14px;
  position: fixed;
  transition: background 120ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 2147483647;
}
#${BUTTON_ID}:hover { background: #2a3142; }
#${BUTTON_ID}:active { transform: scale(0.98); }
#${BUTTON_ID}:focus-visible { outline: 2px solid #2747D6; outline-offset: 2px; }
#${BUTTON_ID} svg { width: 14px; height: 14px; }
#${BUTTON_ID}[data-state="working"] { background: #2747D6; }
#${BUTTON_ID}[data-state="working"]:hover { background: #1f3cc1; }
#${BUTTON_ID}[data-state="working"] svg { animation: simplewords-spin 1s linear infinite; }

#${PANEL_ID} {
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  animation: simplewords-pop 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  backdrop-filter: blur(12px) saturate(1.2);
  background: rgba(255, 252, 247, 0.96);
  border: 1px solid rgba(229, 224, 214, 0.7);
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(14, 21, 37, 0.22);
  color: #0E1525;
  font: 14px/1.5 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 420px;
  min-width: 280px;
  padding: 16px;
  position: fixed;
  z-index: 2147483647;
}
#${PANEL_ID} .sw-head {
  align-items: center;
  color: #526071;
  display: flex;
  font-size: 11px;
  font-weight: 500;
  gap: 8px;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  text-transform: uppercase;
}
#${PANEL_ID} .sw-head svg { width: 14px; height: 14px; color: #2747D6; }
#${PANEL_ID} .sw-body {
  color: #0E1525;
  margin-bottom: 14px;
  white-space: pre-wrap;
}
#${PANEL_ID} .sw-loading {
  align-items: center;
  color: #526071;
  display: flex;
  gap: 10px;
  margin-bottom: 0;
}
#${PANEL_ID} .sw-loading svg {
  animation: simplewords-spin 1s linear infinite;
  color: #2747D6;
  height: 16px;
  width: 16px;
}
#${PANEL_ID} .sw-actions { display: flex; gap: 8px; }
#${PANEL_ID} .sw-btn {
  align-items: center;
  border-radius: 8px;
  border: 0;
  cursor: pointer;
  display: inline-flex;
  font: 600 13px/1 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  gap: 6px;
  padding: 9px 13px;
  transition: background 120ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
#${PANEL_ID} .sw-btn:active { transform: scale(0.98); }
#${PANEL_ID} .sw-btn:focus-visible { outline: 2px solid #2747D6; outline-offset: 2px; }
#${PANEL_ID} .sw-btn--primary { background: #0E1525; color: #FAF8F5; }
#${PANEL_ID} .sw-btn--primary:hover { background: #2a3142; }
#${PANEL_ID} .sw-btn--ghost {
  background: transparent;
  border: 1px solid #c9d2e3;
  color: #0E1525;
}
#${PANEL_ID} .sw-btn--ghost:hover { background: #f1eee8; }

@keyframes simplewords-spin { to { transform: rotate(360deg); } }
@keyframes simplewords-pop {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`

let activeEditor: HTMLElement | null = null

const editorVisibilityObserver = new MutationObserver((mutations) => {
  if (!activeEditor || !mutations.some(mutationAffectsActiveEditor)) {
    return
  }

  refreshActiveEditorUI()
})

editorVisibilityObserver.observe(document.documentElement, {
  attributeFilter: ['aria-hidden', 'class', 'hidden', 'open', 'style'],
  attributes: true,
  childList: true,
  subtree: true
})

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
    refreshActiveEditorUI()
  },
  { passive: true }
)

window.addEventListener('resize', () => {
  refreshActiveEditorUI()
})

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLE_CSS
  document.documentElement.append(style)
}

function showButton(editor: HTMLElement): void {
  if (!isActiveEditorVisible(editor)) {
    hideInjectedUI()
    return
  }

  const button = getOrCreateButton()
  button.hidden = false
  positionButton(editor)
}

function refreshActiveEditorUI(): void {
  if (!activeEditor) {
    return
  }

  if (!isActiveEditorVisible(activeEditor)) {
    activeEditor = null
    hideInjectedUI()
    return
  }

  positionButton(activeEditor)
}

function hideInjectedUI(): void {
  const button = document.getElementById(BUTTON_ID)
  if (button instanceof HTMLButtonElement) {
    button.hidden = true
  }

  const panel = document.getElementById(PANEL_ID)
  if (panel instanceof HTMLDivElement) {
    panel.hidden = true
  }
}

function getOrCreateButton(): HTMLButtonElement {
  ensureStyles()

  const existing = document.getElementById(BUTTON_ID)
  if (existing instanceof HTMLButtonElement) {
    return existing
  }

  const button = document.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.setAttribute('aria-label', 'Simple Words')
  setButtonState(button, 'idle')
  button.addEventListener('mousedown', (event) => event.preventDefault())
  button.addEventListener('click', () => {
    void refineActiveEditor()
  })
  document.documentElement.append(button)
  return button
}

function setButtonState(
  button: HTMLButtonElement,
  state: 'idle' | 'working'
): void {
  button.dataset.state = state
  const icon = state === 'working' ? LOADER_SVG : SPARKLES_SVG
  const label = state === 'working' ? 'Refining' : 'Simple Words'
  button.innerHTML = `${icon}<span>${label}</span>`
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
    showPanel(editor, { kind: 'message', message: 'Write a rough reply first.' })
    return
  }

  const button = getOrCreateButton()
  setButtonState(button, 'working')
  showPanel(editor, { kind: 'loading' })

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

  setButtonState(button, 'idle')

  if (response.error || !response.reply) {
    showPanel(editor, {
      kind: 'message',
      message: response.error ?? 'No reply returned.'
    })
    return
  }

  showPanel(editor, { kind: 'result', reply: response.reply })
}

type PanelContent =
  | { kind: 'loading' }
  | { kind: 'message'; message: string }
  | { kind: 'result'; reply: string }

function showPanel(editor: HTMLElement, content: PanelContent): void {
  const panel = getOrCreatePanel()
  panel.replaceChildren()

  const head = document.createElement('div')
  head.className = 'sw-head'
  head.innerHTML = `${SPARKLES_SVG}<span>${
    content.kind === 'loading' ? 'Refining draft' : 'Refined draft'
  }</span>`
  panel.append(head)

  if (content.kind === 'loading') {
    const loading = document.createElement('div')
    loading.className = 'sw-loading'
    loading.innerHTML = `${LOADER_SVG}<span>Refining…</span>`
    panel.append(loading)
  } else {
    const body = document.createElement('div')
    body.className = 'sw-body'
    body.textContent =
      content.kind === 'result' ? content.reply : content.message
    panel.append(body)

    if (content.kind === 'result') {
      const actions = document.createElement('div')
      actions.className = 'sw-actions'

      const replace = document.createElement('button')
      replace.type = 'button'
      replace.className = 'sw-btn sw-btn--primary'
      replace.textContent = 'Replace draft'
      replace.addEventListener('click', () => {
        setEditorText(editor, content.reply)
        panel.hidden = true
        editor.focus()
      })

      const dismiss = document.createElement('button')
      dismiss.type = 'button'
      dismiss.className = 'sw-btn sw-btn--ghost'
      dismiss.textContent = 'Dismiss'
      dismiss.addEventListener('click', () => {
        panel.hidden = true
        editor.focus()
      })

      actions.append(replace, dismiss)
      panel.append(actions)
    }
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
  ensureStyles()

  const existing = document.getElementById(PANEL_ID)
  if (existing instanceof HTMLDivElement) {
    return existing
  }

  const panel = document.createElement('div')
  panel.id = PANEL_ID
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Simple Words refinement')
  document.documentElement.append(panel)
  return panel
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

function isActiveEditorVisible(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false
  }

  let current: HTMLElement | null = element
  while (current) {
    if (
      current.hidden ||
      current.getAttribute('aria-hidden') === 'true' ||
      isClosedContainer(current, element) ||
      isHiddenByStyle(current)
    ) {
      return false
    }

    current = current.parentElement
  }

  return true
}

function isHiddenByStyle(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse'
  )
}

function isClosedContainer(
  current: HTMLElement,
  activeElement: HTMLElement
): boolean {
  if (current instanceof HTMLDialogElement && !current.open) {
    return true
  }

  return (
    current instanceof HTMLDetailsElement &&
    !current.open &&
    !isInDetailsSummary(activeElement, current)
  )
}

function isInDetailsSummary(
  element: HTMLElement,
  details: HTMLDetailsElement
): boolean {
  const summary = Array.from(details.children).find(
    (child) => child.tagName.toLowerCase() === 'summary'
  )

  return summary?.contains(element) ?? false
}

function mutationAffectsActiveEditor(mutation: MutationRecord): boolean {
  const editor = activeEditor
  if (!editor) {
    return false
  }

  if (mutation.target === editor) {
    return true
  }

  if (mutation.target instanceof Element && mutation.target.contains(editor)) {
    return true
  }

  return Array.from(mutation.removedNodes).some(
    (node) =>
      node === editor || (node instanceof Element && node.contains(editor))
  )
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
