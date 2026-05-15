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
  avoidRects?: RectLike[]
}): { top: number; left: number } {
  const { avoidRects = [] } = options
  const candidates = buttonCandidateRectsNearEditor(options)

  const nonOverlappingCandidate = candidates.find(
    (candidate) => !rectOverlapsAny(candidate, avoidRects)
  )

  return nonOverlappingCandidate ?? candidates[0]
}

export function buttonCandidateRectsNearEditor(options: {
  editorRect: RectLike
  buttonSize: Size
  viewportSize: Size
}): RectLike[] {
  const { editorRect, buttonSize, viewportSize } = options
  const fitsInsideEditor =
    editorRect.height >= buttonSize.height + BUTTON_GAP * 2
  const lowerRightTop = fitsInsideEditor
    ? editorRect.bottom - buttonSize.height - BUTTON_GAP
    : editorRect.top + editorRect.height / 2 - buttonSize.height / 2
  const rightAlignedLeft = editorRect.right - buttonSize.width - BUTTON_GAP
  const maxTop = viewportSize.height - buttonSize.height - VIEWPORT_GUTTER
  const maxLeft = viewportSize.width - buttonSize.width - VIEWPORT_GUTTER
  return [
    { top: lowerRightTop, left: rightAlignedLeft },
    { top: editorRect.top + BUTTON_GAP, left: rightAlignedLeft },
    { top: editorRect.bottom + BUTTON_GAP, left: rightAlignedLeft },
    {
      top: editorRect.top - buttonSize.height - BUTTON_GAP,
      left: rightAlignedLeft
    },
    { top: lowerRightTop, left: editorRect.right + BUTTON_GAP },
    {
      top: lowerRightTop,
      left: editorRect.left - buttonSize.width - BUTTON_GAP
    }
  ].map((candidate) => {
    const top = Math.max(VIEWPORT_GUTTER, Math.min(maxTop, candidate.top))
    const left = Math.max(VIEWPORT_GUTTER, Math.min(maxLeft, candidate.left))
    return {
      top,
      left,
      right: left + buttonSize.width,
      bottom: top + buttonSize.height,
      width: buttonSize.width,
      height: buttonSize.height
    }
  })
}

function rectOverlapsAny(rect: RectLike, avoidRects: RectLike[]): boolean {
  return avoidRects.some((avoidRect) => rectsOverlap(rect, avoidRect))
}

function rectsOverlap(a: RectLike, b: RectLike): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}
