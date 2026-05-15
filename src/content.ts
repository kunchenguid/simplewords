import { serializeVisibleTextTree } from './domTree'
import { t } from './i18n'
import {
  isExtensionContextValid,
  isExtensionContextInvalidatedError,
  markExtensionContextInvalidated,
  onExtensionContextInvalidated,
  safeChromeCall,
  safeChromePromise
} from './chromeApi'
import {
  DEFAULT_SETTINGS,
  normalizeEnabledDomains,
  isSimpleWordsEnabledForUrl,
  normalizeSettings,
  type SimpleWordsSettings
} from './settings'
import {
  buttonCandidateRectsNearEditor,
  buttonPositionNearEditor,
  panelPositionAboveButton
} from './uiPosition'
import type { RectLike } from './uiPosition'

const BUTTON_ID = 'simplewords-button'
const PANEL_ID = 'simplewords-panel'
const STYLE_ID = 'simplewords-style'
const MAX_CONTEXT_CHARS = 30_000
const BUTTON_SIZE = 24
const SMALL_BUTTON_SIZE = 20
const SMALL_EDITOR_HEIGHT = 34
const CLICKABLE_AVOID_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'summary'
].join(',')
const CLICKABLE_AVOID_PROXIMITY = 80

const BRAND_GLYPH_SVG = `<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><text x="32" y="47" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="48">sw</text></svg>`

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
  display: flex;
  font: 600 13px/1 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  height: 24px;
  justify-content: center;
  letter-spacing: -0.005em;
  padding: 0;
  position: fixed;
  transition: background 120ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
  width: 24px;
  z-index: 2147483647;
}
#${BUTTON_ID}:hover { background: #2a3142; }
#${BUTTON_ID}:active { transform: scale(0.98); }
#${BUTTON_ID}:focus-visible { outline: 2px solid #2747D6; outline-offset: 2px; }
#${BUTTON_ID}[hidden],
#${PANEL_ID}[hidden] {
  display: none !important;
}
#${BUTTON_ID}[data-size="normal"] {
  height: 24px;
  width: 24px;
}
#${BUTTON_ID}[data-size="normal"] svg { width: 18px; height: 18px; }
#${BUTTON_ID}[data-size="small"] {
  height: 20px;
  width: 20px;
}
#${BUTTON_ID}[data-size="small"] svg { width: 15px; height: 15px; }
#${BUTTON_ID}[data-state="working"] svg { width: 14px; height: 14px; }
#${BUTTON_ID}[data-size="small"][data-state="working"] svg { width: 12px; height: 12px; }
#${BUTTON_ID} span {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
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
let dismissedEditor: HTMLElement | null = null
let activeRefinementId = 0
let siteEnabled = !hasChromeStorage()
let interactingWithInjectedUI = false

onExtensionContextInvalidated(disableStaleContentScript)

void loadSiteEnablement()

addStorageChangeListener()

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
  if (!canHandleEvents()) {
    return
  }

  const editor = findEditableRoot(event.target)
  if (!editor) {
    if (
      activeEditor &&
      event.target instanceof Node &&
      !activeEditor.contains(event.target) &&
      !isInjectedUITarget(event.target)
    ) {
      deactivateActiveEditor()
    }

    return
  }

  if (editor === dismissedEditor) {
    return
  }

  dismissedEditor = null
  activeEditor = editor
  showButton(editor)
})

document.addEventListener('focusout', (event) => {
  const editor = activeEditor
  if (!editor || !isEventFromEditor(event, editor)) {
    return
  }

  window.setTimeout(() => {
    if (activeEditor !== editor) {
      return
    }

    const relatedTarget = event.relatedTarget
    if (isInjectedUITarget(relatedTarget)) {
      return
    }

    if (interactingWithInjectedUI) {
      return
    }

    if (relatedTarget instanceof Node && editor.contains(relatedTarget)) {
      return
    }

    const nextEditor = findEditableRoot(relatedTarget)
    if (nextEditor) {
      activeEditor = nextEditor
      showButton(nextEditor)
      return
    }

    if (!isEditorFocused(editor)) {
      activeEditor = null
      activeRefinementId += 1
      hideInjectedUI()
    }
  }, 0)
})

document.addEventListener(
  'mousedown',
  (event) => {
    handlePointerStart(event.target)
  },
  { capture: true }
)

document.addEventListener(
  'pointerdown',
  (event) => {
    handlePointerStart(event.target)
  },
  { capture: true }
)

document.addEventListener('input', (event) => {
  if (!canHandleEvents()) {
    return
  }

  const editor = findEditableRoot(event.target)
  if (!editor || editor === dismissedEditor || !isEditorFocused(editor)) {
    return
  }

  dismissedEditor = null
  if (editor === activeEditor) {
    activeRefinementId += 1
    hideVisiblePanel()
    setButtonIdle()
  }

  activeEditor = editor
  showButton(editor)
})

document.addEventListener('selectionchange', () => {
  if (!canHandleEvents()) {
    return
  }

  const editor = findEditableRoot(document.activeElement)
  if (editor && editor !== dismissedEditor) {
    activeEditor = editor
    showButton(editor)
  }
})

window.addEventListener(
  'scroll',
  () => {
    refreshActiveEditorUI()
  },
  { passive: true }
)

document.addEventListener(
  'scroll',
  () => {
    refreshActiveEditorUI()
  },
  { capture: true, passive: true }
)

window.visualViewport?.addEventListener(
  'scroll',
  () => {
    refreshActiveEditorUI()
  },
  { passive: true }
)

window.visualViewport?.addEventListener('resize', () => {
  refreshActiveEditorUI()
})

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
    if (editor === activeEditor) {
      activeEditor = null
      activeRefinementId += 1
    }
    hideInjectedUI()
    return
  }

  const button = getOrCreateButton()
  button.hidden = false
  positionButton(editor)
}

function refreshActiveEditorUI(): void {
  if (!canHandleEvents()) {
    return
  }

  if (!activeEditor) {
    return
  }

  if (!isEditorFocused(activeEditor)) {
    deactivateActiveEditor()
    return
  }

  if (!isActiveEditorVisible(activeEditor)) {
    deactivateActiveEditor()
    return
  }

  positionButton(activeEditor)
  positionVisiblePanel()
}

async function loadSiteEnablement(): Promise<void> {
  if (!hasChromeStorage()) {
    return
  }

  const rawSettings = await safeChromePromise(
    () =>
      chrome.storage.local.get(DEFAULT_SETTINGS) as Promise<
        Partial<SimpleWordsSettings>
      >,
    null
  )
  if (!rawSettings) {
    setSiteEnabled(false)
    return
  }

  setSiteEnabled(
    isSimpleWordsEnabledForUrl(normalizeSettings(rawSettings), location.href)
  )
}

function addStorageChangeListener(): void {
  if (!hasChromeStorage()) {
    return
  }

  safeChromeCall(() => {
    chrome.storage.onChanged?.addListener?.((changes, areaName) => {
      if (areaName !== 'local' || !changes.enabledDomains) {
        return
      }

      setSiteEnabled(
        isSimpleWordsEnabledForUrl(
          {
            enabledDomains: normalizeEnabledDomains(
              changes.enabledDomains.newValue,
              []
            )
          },
          location.href
        )
      )
    })
  }, undefined)
}

function disableStaleContentScript(): void {
  activeEditor = null
  dismissedEditor = null
  activeRefinementId += 1
  hideInjectedUI()
}

function deactivateActiveEditor(): void {
  activeEditor = null
  activeRefinementId += 1
  hideInjectedUI()
}

function canHandleEvents(): boolean {
  return siteEnabled && isExtensionContextValid()
}

function setSiteEnabled(enabled: boolean): void {
  if (enabled === siteEnabled) {
    return
  }

  siteEnabled = enabled
  if (!siteEnabled) {
    activeEditor = null
    dismissedEditor = null
    activeRefinementId += 1
    hideInjectedUI()
    return
  }

  const editor = findEditableRoot(document.activeElement)
  if (editor) {
    dismissedEditor = null
    activeEditor = editor
    showButton(editor)
  }
}

function hasChromeStorage(): boolean {
  return safeChromeCall(() => {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
  }, false)
}

function hideInjectedUI(): void {
  const button = document.getElementById(BUTTON_ID)
  if (button instanceof HTMLButtonElement) {
    setButtonState(button, 'idle')
    button.hidden = true
  }

  hideVisiblePanel()
}

function hideVisiblePanel(): void {
  const panel = document.getElementById(PANEL_ID)
  if (panel instanceof HTMLDivElement) {
    panel.hidden = true
  }
}

function setButtonIdle(): void {
  const button = document.getElementById(BUTTON_ID)
  if (button instanceof HTMLButtonElement) {
    setButtonState(button, 'idle')
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
  button.setAttribute('aria-label', t('buttonLabel'))
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
  const icon = state === 'working' ? LOADER_SVG : BRAND_GLYPH_SVG
  const label = state === 'working' ? t('buttonWorkingLabel') : t('buttonLabel')
  button.innerHTML = `${icon}<span></span>`
  const labelElement = button.querySelector('span')
  if (labelElement) {
    labelElement.textContent = label
  }
}

function positionButton(editor: HTMLElement): void {
  const button = getOrCreateButton()
  const rect = editor.getBoundingClientRect()
  const size = buttonSizeForEditor(rect)
  button.dataset.size = size === SMALL_BUTTON_SIZE ? 'small' : 'normal'
  const position = buttonPositionNearEditor({
    editorRect: rect,
    buttonSize: { width: size, height: size },
    viewportSize: { width: window.innerWidth, height: window.innerHeight },
    avoidRects: clickableAvoidRectsNearEditor(editor, rect)
  })
  button.style.top = `${position.top}px`
  button.style.left = `${position.left}px`
}

function clickableAvoidRectsNearEditor(
  editor: HTMLElement,
  editorRect: DOMRect
): DOMRect[] {
  const size = buttonSizeForEditor(editorRect)
  const buttonSize = { width: size, height: size }
  const candidateRects = buttonCandidateRectsNearEditor({
    editorRect,
    buttonSize,
    viewportSize: { width: window.innerWidth, height: window.innerHeight }
  })
  const elementsFromPoint = document.elementsFromPoint?.bind(document)

  if (elementsFromPoint) {
    const elements = new Set<HTMLElement>()

    for (const candidateRect of candidateRects) {
      for (const element of elementsFromCandidateRect(
        candidateRect,
        elementsFromPoint
      )) {
        const clickableElement = element.closest<HTMLElement>(
          CLICKABLE_AVOID_SELECTOR
        )
        if (clickableElement) {
          elements.add(clickableElement)
        }
      }
    }

    return Array.from(elements)
      .filter((element) => element !== editor)
      .filter((element) => !element.contains(editor))
      .filter((element) => !isInjectedUITarget(element))
      .filter((element) => {
        const visibility = getComputedStyle(element).visibility
        return visibility !== 'hidden' && visibility !== 'collapse'
      })
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .filter((rect) =>
        candidateRects.some((candidateRect) =>
          rectsOverlap(rect, candidateRect)
        )
      )
  }

  const proximityRect = expandedRect(editorRect, CLICKABLE_AVOID_PROXIMITY)

  return Array.from(
    document.querySelectorAll<HTMLElement>(CLICKABLE_AVOID_SELECTOR)
  )
    .filter((element) => element !== editor)
    .filter((element) => !element.contains(editor))
    .filter((element) => !isInjectedUITarget(element))
    .filter((element) => {
      const visibility = getComputedStyle(element).visibility
      return visibility !== 'hidden' && visibility !== 'collapse'
    })
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .filter((rect) => rectsOverlap(rect, proximityRect))
}

function elementsFromCandidateRect(
  rect: RectLike,
  elementsFromPoint: (x: number, y: number) => Element[]
): Element[] {
  const elements: Element[] = []
  const sampleInterval = 8
  const right = rect.right - 1
  const bottom = rect.bottom - 1

  for (let y = rect.top; y < rect.bottom; y += sampleInterval) {
    for (let x = rect.left; x < rect.right; x += sampleInterval) {
      elements.push(...elementsFromPoint(x, y))
    }
    elements.push(...elementsFromPoint(right, y))
  }

  for (let x = rect.left; x < rect.right; x += sampleInterval) {
    elements.push(...elementsFromPoint(x, bottom))
  }
  elements.push(...elementsFromPoint(right, bottom))

  return elements
}

function expandedRect(rect: DOMRect, amount: number): DOMRect {
  return new DOMRect(
    rect.left - amount,
    rect.top - amount,
    rect.width + amount * 2,
    rect.height + amount * 2
  )
}

function rectsOverlap(a: RectLike, b: RectLike): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

function buttonSizeForEditor(rect: DOMRect): number {
  return rect.height <= SMALL_EDITOR_HEIGHT ? SMALL_BUTTON_SIZE : BUTTON_SIZE
}

async function refineActiveEditor(): Promise<void> {
  const editor = activeEditor
  if (!editor) {
    return
  }

  const draft = getEditorText(editor)
  if (!draft) {
    showPanel(editor, {
      kind: 'message',
      message: t('emptyDraftMessage')
    })
    return
  }

  const button = getOrCreateButton()
  const refinementId = ++activeRefinementId
  setButtonState(button, 'working')
  showPanel(editor, { kind: 'loading' })

  const contextTree = serializeVisibleTextTree(document.body, editor).slice(
    0,
    MAX_CONTEXT_CHARS
  )
  const response = await requestRefinement({
    type: 'simplewords.refine',
    draft,
    contextTree,
    title: document.title,
    url: location.href
  })

  if (refinementId !== activeRefinementId) {
    return
  }

  if (editor !== activeEditor || !isActiveEditorVisible(editor)) {
    setButtonState(button, 'idle')
    return
  }

  setButtonState(button, 'idle')

  if (response.error || !response.reply) {
    showPanel(editor, {
      kind: 'message',
      message: response.error ?? t('noReplyMessage'),
      action: response.action
    })
    return
  }

  showPanel(editor, { kind: 'result', reply: response.reply })
}

type RefinementResponse = {
  reply?: string
  error?: string
  action?: 'openOptions'
}

async function requestRefinement(request: {
  type: 'simplewords.refine'
  draft: string
  contextTree: string
  title: string
  url: string
}): Promise<RefinementResponse> {
  if (!isExtensionContextValid()) {
    return { error: t('unableToRefineReply') }
  }

  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { error: t('unableToRefineReply') }
  }

  let response: RefinementResponse | null | undefined
  try {
    response = (await chrome.runtime.sendMessage(request)) as RefinementResponse
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      markExtensionContextInvalidated()
      return { error: t('unableToRefineReply') }
    }

    return {
      error: error instanceof Error ? error.message : t('unableToRefineReply')
    }
  }

  return response ?? { error: t('unableToRefineReply') }
}

type PanelContent =
  | { kind: 'loading' }
  | { kind: 'message'; message: string; action?: 'openOptions' }
  | { kind: 'result'; reply: string }

function showPanel(editor: HTMLElement, content: PanelContent): void {
  const panel = getOrCreatePanel()
  panel.replaceChildren()

  const head = document.createElement('div')
  head.className = 'sw-head'
  head.innerHTML = SPARKLES_SVG
  const heading = document.createElement('span')
  heading.textContent = panelTitle(content)
  head.append(heading)
  panel.append(head)

  if (content.kind === 'loading') {
    const loading = document.createElement('div')
    loading.className = 'sw-loading'
    loading.innerHTML = LOADER_SVG
    const loadingLabel = document.createElement('span')
    loadingLabel.textContent = t('loadingPanelMessage')
    loading.append(loadingLabel)
    panel.append(loading)
  } else {
    const body = document.createElement('div')
    body.className = 'sw-body'
    body.textContent =
      content.kind === 'result' ? content.reply : content.message
    panel.append(body)

    const opensOptions =
      content.kind === 'message' && content.action === 'openOptions'
    if (content.kind === 'result' || opensOptions) {
      const actions = document.createElement('div')
      actions.className = 'sw-actions'

      if (content.kind === 'result') {
        const replace = document.createElement('button')
        replace.type = 'button'
        replace.className = 'sw-btn sw-btn--primary'
        replace.textContent = t('replaceDraftButton')
        replace.addEventListener('click', () => {
          interactingWithInjectedUI = false
          setEditorText(editor, content.reply)
          panel.hidden = true
          editor.focus()
        })

        actions.append(replace)
      }

      if (opensOptions) {
        const openSettings = document.createElement('button')
        openSettings.type = 'button'
        openSettings.className = 'sw-btn sw-btn--primary'
        openSettings.textContent = t('openSettingsButton')
        openSettings.addEventListener('click', () => {
          interactingWithInjectedUI = false
          void requestOpenOptionsPage()
        })

        actions.append(openSettings)
      }

      const dismiss = document.createElement('button')
      dismiss.type = 'button'
      dismiss.className = 'sw-btn sw-btn--ghost'
      dismiss.textContent = t('dismissButton')
      dismiss.addEventListener('click', () => {
        interactingWithInjectedUI = false
        panel.hidden = true
        editor.focus()
      })

      actions.append(dismiss)
      panel.append(actions)
    }
  }

  panel.hidden = false
  positionVisiblePanel()
}

function panelTitle(content: PanelContent): string {
  if (content.kind === 'loading') {
    return t('loadingPanelTitle')
  }

  if (content.kind === 'result') {
    return t('resultPanelTitle')
  }

  return t('messagePanelTitle')
}

async function requestOpenOptionsPage(): Promise<void> {
  if (!isExtensionContextValid()) {
    return
  }

  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return
  }

  try {
    await chrome.runtime.sendMessage({ type: 'simplewords.openOptions' })
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      markExtensionContextInvalidated()
    }
  }
}

function positionVisiblePanel(): void {
  const panel = document.getElementById(PANEL_ID)
  if (!(panel instanceof HTMLDivElement) || panel.hidden) {
    return
  }

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
  panel.setAttribute('aria-label', t('panelAriaLabel'))
  panel.addEventListener('pointerdown', preventInjectedUIFocus)
  panel.addEventListener('mousedown', preventInjectedUIFocus)
  document.documentElement.append(panel)
  return panel
}

function preventInjectedUIFocus(event: Event): void {
  event.preventDefault()
}

function findEditableRoot(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null
  }

  if (target instanceof HTMLTextAreaElement || isSupportedTextInput(target)) {
    return target
  }

  const editableAncestor = target.closest<HTMLElement>(
    '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
  )

  if (editableAncestor) {
    return editableAncestor
  }

  if (target.isContentEditable) {
    return target
  }

  return null
}

function isSupportedTextInput(
  element: HTMLElement
): element is HTMLInputElement {
  return (
    element instanceof HTMLInputElement &&
    ['email', 'search', 'text', 'url'].includes(element.type)
  )
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
      hasNoLayoutBox(current)
    ) {
      return false
    }

    current = current.parentElement
  }

  return isElementInsideViewport(element) && isVisibleByStyle(element)
}

function isElementInsideViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth
  )
}

function hasNoLayoutBox(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  return style.display === 'none'
}

function isVisibleByStyle(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  return style.visibility !== 'hidden' && style.visibility !== 'collapse'
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

function isEventFromEditor(event: Event, editor: HTMLElement): boolean {
  return (
    event.target === editor ||
    (event.target instanceof Node && editor.contains(event.target))
  )
}

function isEditorFocused(editor: HTMLElement): boolean {
  const activeElement = document.activeElement
  return activeElement === editor || editor.contains(activeElement)
}

function isInjectedUITarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false
  }

  const button = document.getElementById(BUTTON_ID)
  if (button?.contains(target)) {
    return true
  }

  const panel = document.getElementById(PANEL_ID)
  return panel?.contains(target) ?? false
}

function handlePointerStart(target: EventTarget | null): void {
  if (!canHandleEvents()) {
    return
  }

  const editor = activeEditor
  if (!(target instanceof Node)) {
    return
  }

  if (dismissedEditor?.contains(target)) {
    dismissedEditor = null
  }

  const targetEditor = findEditableRoot(target)
  if (targetEditor && targetEditor !== dismissedEditor) {
    dismissedEditor = null
    activeEditor = targetEditor
    showButton(targetEditor)
    return
  }

  if (!editor || editor.contains(target)) {
    interactingWithInjectedUI = false
    return
  }

  if (isInjectedUITarget(target)) {
    interactingWithInjectedUI = true
    return
  }

  interactingWithInjectedUI = false
  dismissedEditor = editor
  activeEditor = null
  activeRefinementId += 1
  hideInjectedUI()
}

function getEditorText(element: HTMLElement): string {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    return element.value.trim()
  }

  if (element.isContentEditable) {
    return getContentEditableText(element).trim()
  }

  return (element.textContent ?? '').trim()
}

function getContentEditableText(element: HTMLElement): string {
  let text = ''
  const childNodes = Array.from(element.childNodes)

  childNodes.forEach((node, index) => {
    if (node instanceof HTMLBRElement) {
      text += '\n'
    } else if (node instanceof Text) {
      text += node.data
    } else if (node instanceof HTMLElement) {
      const startsNewLine =
        isContentEditableBlock(node) && text && !text.endsWith('\n')

      if (startsNewLine) {
        text += '\n'
      }

      text += getContentEditableText(node)

      if (
        isContentEditableBlock(node) &&
        index < childNodes.length - 1 &&
        !text.endsWith('\n')
      ) {
        text += '\n'
      }
    }
  })

  return text
}

function isContentEditableBlock(element: HTMLElement): boolean {
  return ['DIV', 'P', 'LI'].includes(element.tagName)
}

function setEditorText(element: HTMLElement, value: string): void {
  if (!replaceWithNativeEditing(element, value)) {
    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
    ) {
      element.value = value
    } else if (element.isContentEditable) {
      element.replaceChildren()
      value.split(/\r\n|\r|\n/).forEach((line, index) => {
        if (index > 0) {
          element.append(document.createElement('br'))
        }

        if (line) {
          element.append(document.createTextNode(line))
        }
      })
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
  }

  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function replaceWithNativeEditing(
  element: HTMLElement,
  value: string
): boolean {
  if (
    typeof document.execCommand !== 'function' ||
    !(
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement ||
      element.isContentEditable
    )
  ) {
    return false
  }

  element.focus()
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    element.select()
  } else {
    const selection = document.getSelection()
    if (!selection) {
      return false
    }

    const range = document.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  if (!document.execCommand('insertText', false, value)) {
    return false
  }

  return getEditorText(element) === value.trim()
}
