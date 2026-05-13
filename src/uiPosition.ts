export type RectLike = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export type Size = {
  width: number
  height: number
}

const VIEWPORT_GUTTER = 8
const PANEL_GAP = 12
const BUTTON_GAP = 8

export function panelPositionAboveButton(options: {
  buttonRect: RectLike
  panelSize: Size
  viewportSize: Size
}): { top: number; left: number } {
  const { buttonRect, panelSize, viewportSize } = options
  const centeredLeft =
    buttonRect.left + buttonRect.width / 2 - panelSize.width / 2
  const maxLeft = viewportSize.width - panelSize.width - VIEWPORT_GUTTER

  return {
    top: Math.max(
      VIEWPORT_GUTTER,
      buttonRect.top - panelSize.height - PANEL_GAP
    ),
    left: Math.max(VIEWPORT_GUTTER, Math.min(maxLeft, centeredLeft))
  }
}

export function buttonPositionNearEditor(options: {
  editorRect: RectLike
  buttonSize: Size
  viewportSize: Size
}): { top: number; left: number } {
  const { editorRect, buttonSize, viewportSize } = options
  const fitsInsideEditor =
    editorRect.height >= buttonSize.height + BUTTON_GAP * 2
  const unclampedTop = fitsInsideEditor
    ? editorRect.bottom - buttonSize.height - BUTTON_GAP
    : editorRect.top + editorRect.height / 2 - buttonSize.height / 2
  const unclampedLeft = editorRect.right - buttonSize.width - BUTTON_GAP
  const maxTop = viewportSize.height - buttonSize.height - VIEWPORT_GUTTER
  const maxLeft = viewportSize.width - buttonSize.width - VIEWPORT_GUTTER

  return {
    top: Math.max(VIEWPORT_GUTTER, Math.min(maxTop, unclampedTop)),
    left: Math.max(VIEWPORT_GUTTER, Math.min(maxLeft, unclampedLeft))
  }
}
