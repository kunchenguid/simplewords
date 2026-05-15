import { describe, expect, test } from 'vitest'
import {
  buttonPositionNearEditor,
  panelPositionAboveButton
} from '../src/uiPosition'

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

describe('buttonPositionNearEditor', () => {
  test('places a compact button inside the lower-right of a tall editor', () => {
    const position = buttonPositionNearEditor({
      editorRect: {
        top: 333,
        left: 596,
        right: 1123,
        bottom: 658,
        width: 527,
        height: 325
      },
      buttonSize: { width: 24, height: 24 },
      viewportSize: { width: 1200, height: 728 }
    })

    expect(position.top).toBe(626)
    expect(position.left).toBe(1091)
  })

  test('centers a small button on short single-line editors', () => {
    const position = buttonPositionNearEditor({
      editorRect: {
        top: 40,
        left: 20,
        right: 220,
        bottom: 60,
        width: 200,
        height: 20
      },
      buttonSize: { width: 20, height: 20 },
      viewportSize: { width: 390, height: 700 }
    })

    expect(position.top).toBe(40)
    expect(position.left).toBe(192)
  })

  test('uses the upper-right of the editor when the lower-right overlaps an avoided control', () => {
    const position = buttonPositionNearEditor({
      editorRect: {
        top: 100,
        left: 100,
        right: 300,
        bottom: 200,
        width: 200,
        height: 100
      },
      buttonSize: { width: 24, height: 24 },
      viewportSize: { width: 500, height: 500 },
      avoidRects: [
        {
          top: 160,
          left: 260,
          right: 310,
          bottom: 210,
          width: 50,
          height: 50
        }
      ]
    })

    expect(position.top).toBe(108)
    expect(position.left).toBe(268)
  })
})
