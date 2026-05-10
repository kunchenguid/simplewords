const IRRELEVANT_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'nav'
])

const IRRELEVANT_ROLES = new Set([
  'banner',
  'combobox',
  'listbox',
  'menu',
  'menubar',
  'navigation',
  'option',
  'search',
  'toolbar'
])

const FORM_CONTROL_TAGS = new Set(['button', 'select'])

const STRUCTURAL_TAGS = new Set([
  'article',
  'aside',
  'dialog',
  'footer',
  'form',
  'header',
  'main',
  'section'
])

const INLINE_TEXT_TAGS = new Set(['label', 'summary'])

export function serializeVisibleTextTree(
  root: Element,
  activeEditor: Element
): string {
  const lines = serializeElement(root, activeEditor, 0)
  return lines.join('\n')
}

function serializeElement(
  element: Element,
  activeEditor: Element,
  depth: number
): string[] {
  if (!isRelevantVisibleElement(element)) {
    return []
  }

  if (element === activeEditor) {
    return serializeEditor(element, depth)
  }

  const directText = getDirectText(element)
  const elementChildren = Array.from(element.children)
  if (elementChildren.length === 0 && directText) {
    return [`${indent(depth)}${nodeName(element)} ${quote(directText)}`]
  }

  const childDepth = shouldEmitContainer(element) ? depth + 1 : depth
  const childLines: string[] = []
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = normalizeText(child.textContent ?? '')
      if (text) {
        childLines.push(`${indent(childDepth)}text ${quote(text)}`)
      }
      continue
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      childLines.push(
        ...serializeElement(child as Element, activeEditor, childDepth)
      )
    }
  }

  const name = nodeName(element)

  if (childLines.length === 0 && directText) {
    return [`${indent(depth)}${name} ${quote(directText)}`]
  }

  if (INLINE_TEXT_TAGS.has(element.tagName.toLowerCase()) && directText) {
    return [`${indent(depth)}${name} ${quote(directText)}`]
  }

  if (childLines.length === 0) {
    return []
  }

  if (shouldEmitContainer(element)) {
    return [`${indent(depth)}${name}`, ...childLines]
  }

  return childLines
}

function serializeEditor(element: Element, depth: number): string[] {
  const attributes = ['active']
  if (
    element.getAttribute('contenteditable') === 'true' ||
    element.getAttribute('contenteditable') === ''
  ) {
    attributes.push('contenteditable=true')
  }

  const draft = getEditorText(element)
  const lines = [`${indent(depth)}> editor ${attributes.join(' ')}`]
  if (draft) {
    lines.push(`${indent(depth + 1)}draft ${quote(draft)}`)
  }
  return lines
}

function getEditorText(element: Element): string {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    return normalizeText(element.value)
  }

  return normalizeText(element.textContent ?? '')
}

function isRelevantVisibleElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase()
  if (IRRELEVANT_TAGS.has(tagName)) {
    return false
  }

  if (
    element.id === 'simplewords-button' ||
    element.id === 'simplewords-panel'
  ) {
    return false
  }

  if (IRRELEVANT_ROLES.has(element.getAttribute('role') ?? tagName)) {
    return false
  }

  if (FORM_CONTROL_TAGS.has(tagName)) {
    return false
  }

  if (
    element instanceof HTMLInputElement &&
    !isActiveEditorCandidate(element)
  ) {
    return false
  }

  if (
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return false
  }

  const style = getComputedStyle(element)
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse'
  ) {
    return false
  }

  return true
}

function shouldEmitContainer(element: Element): boolean {
  const tagName = element.tagName.toLowerCase()
  if (STRUCTURAL_TAGS.has(tagName)) {
    return true
  }

  const role = element.getAttribute('role')
  return (
    role === 'main' ||
    role === 'article' ||
    role === 'dialog' ||
    role === 'form' ||
    role === 'textbox'
  )
}

function isActiveEditorCandidate(element: HTMLInputElement): boolean {
  return ['email', 'search', 'text', 'url'].includes(element.type)
}

function nodeName(element: Element): string {
  const tagName = element.tagName.toLowerCase()
  if (/^h[1-6]$/.test(tagName)) {
    return 'h'
  }

  if (tagName === 'p' || tagName === 'span') {
    return 'text'
  }

  if (
    tagName === 'textarea' ||
    tagName === 'input' ||
    element.getAttribute('contenteditable') === 'true'
  ) {
    return 'editor'
  }

  return element.getAttribute('role') ?? tagName
}

function getDirectText(element: Element): string {
  let text = ''
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += ` ${child.textContent ?? ''}`
    }
  }
  return normalizeText(text)
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function quote(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function indent(depth: number): string {
  return '  '.repeat(depth)
}
