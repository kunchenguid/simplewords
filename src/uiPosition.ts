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
