import { describe, expect, test } from 'vitest'
import { panelPositionAboveButton } from '../src/uiPosition'

describe('panelPositionAboveButton', () => {
  test('places the panel centered above the Simple Words button', () => {
    const position = panelPositionAboveButton({
      buttonRect: {
        top: 322,
        left: 2054,
        right: 2278,
        bottom: 384,
        width: 224,
        height: 62
      },
      panelSize: { width: 420, height: 96 },
      viewportSize: { width: 2310, height: 900 }
    })

    expect(position.top).toBe(214)
    expect(position.left).toBe(1882)
  })

  test('keeps the panel inside the viewport', () => {
    const position = panelPositionAboveButton({
      buttonRect: {
        top: 40,
        left: 4,
        right: 120,
        bottom: 88,
        width: 116,
        height: 48
      },
      panelSize: { width: 420, height: 120 },
      viewportSize: { width: 390, height: 700 }
    })

    expect(position.top).toBe(8)
    expect(position.left).toBe(8)
  })
})
