/* global window, gsap */

window.__timelines = window.__timelines || {}
const tl = gsap.timeline({ paused: true })

// ===== Anchor positions on the 1080x1080 canvas =====
// The compact sw button sits near the reply editor's lower-right edge.
// Reply editor bottom-right: x 948, y 880; button center after 8px inset is 928,860.
const ACTIONS_CY = 925

const SW_BUTTON_CX = 928
const SW_BUTTON_CY = 860

const REPLY_CX = 540
const REPLY_CY = 700

const REPLACE_CX = 130 + 32 + 95 // ~257
const REPLACE_CY = 1080 - 320 // ~760

// Send button x: chrome.left(60) + reply.left(40) + reply.padding-left(32) + button-width/2(75) = ~207
const SEND_CX = 207
const SEND_CY = ACTIONS_CY

const SPARKLE_OFFS = [
  { x: 90, y: 0 },
  { x: 64, y: -64 },
  { x: 0, y: -90 },
  { x: -64, y: -64 },
  { x: -90, y: 0 },
  { x: -64, y: 64 },
  { x: 0, y: 90 },
  { x: 64, y: 64 }
]

// ===== Initial state at t=0 =====
tl.set('#chrome', { opacity: 0 }, 0)
tl.set('#mail-subject', { opacity: 0, y: 16 }, 0)
tl.set('#mail-from', { opacity: 0, y: 16 }, 0)
tl.set('#mail-quote', { opacity: 0, y: 16 }, 0)
tl.set('#reply', { autoAlpha: 0, y: 16 }, 0)
tl.set('#reply-rough .char', { opacity: 0 }, 0)
tl.set('#reply-refined', { opacity: 0 }, 0)
tl.set('#reply-caret', { opacity: 0, x: 0, y: 0 }, 0)

tl.set(
  '#fab',
  { autoAlpha: 0, scale: 0.85, transformOrigin: 'center center' },
  0
)
tl.set('#panel', { autoAlpha: 0, y: 24 }, 0)
tl.set('#panel-loading', { opacity: 1 }, 0)
tl.set('#panel-line-1', { opacity: 0, y: 10 }, 0)
tl.set('#panel-line-2', { opacity: 0, y: 10 }, 0)
tl.set('#panel-line-3', { opacity: 0, y: 10 }, 0)
tl.set('#panel-line-4', { opacity: 0, y: 10 }, 0)
tl.set('#panel-actions', { autoAlpha: 0, y: 8 }, 0)

tl.set('#cursor', { opacity: 0, x: 1080, y: 1080 }, 0)
tl.set('#click-ring', { opacity: 0, scale: 0, x: 0, y: 0 }, 0)
tl.set('.sparkle', { opacity: 0, scale: 0, x: SW_BUTTON_CX, y: SW_BUTTON_CY }, 0)
tl.set('.send-trail', { opacity: 0, scale: 0, x: SEND_CX, y: SEND_CY }, 0)

tl.set('#outro', { opacity: 0 }, 0)
tl.set('#outro-glyph', { opacity: 0, y: 30, scale: 0.92 }, 0)
tl.set('#outro-wordmark', { opacity: 0, y: 24 }, 0)
tl.set('#outro-tag', { opacity: 0, y: 16 }, 0)
tl.set('#outro-cta', { opacity: 0, y: 12 }, 0)

tl.set('#wipe', { y: '100%' }, 0)

// ====================================================================
// SCENE 1 — INTRO (0.0 -> 2.2)
// ====================================================================
tl.from(
  '#intro-eyebrow',
  { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out' },
  0.2
)
tl.from(
  '#intro-headline',
  { opacity: 0, y: 36, duration: 0.9, ease: 'power3.out' },
  0.5
)

// ====================================================================
// TRANSITION — wipe up (2.2 -> 2.9)
// ====================================================================
tl.to('#wipe', { y: '0%', duration: 0.32, ease: 'power3.in' }, 2.2)
tl.set('#intro', { opacity: 0 }, 2.55)
tl.set('#chrome', { opacity: 1 }, 2.55)
tl.to('#wipe', { y: '-100%', duration: 0.32, ease: 'power3.out' }, 2.55)

// ====================================================================
// SCENE 2 — EMAIL REVEAL (2.95 -> 4.5)
// ====================================================================
tl.to(
  '#mail-subject',
  { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
  2.95
)
tl.to(
  '#mail-from',
  { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
  3.1
)
tl.to('#mail-quote', { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 3.3)
tl.to(
  '#reply',
  { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' },
  3.65
)

// ====================================================================
// SCENE 3 — HOLD reading email (longer now), then CURSOR + TYPEWRITER
// ====================================================================
// Quote finishes at ~4.0; longer email needs ~3.5s reading time.
tl.to(
  '#cursor',
  {
    opacity: 1,
    x: REPLY_CX - 16,
    y: REPLY_CY - 16,
    duration: 0.85,
    ease: 'power2.inOut'
  },
  7.2
)
tl.set('#reply-caret', { x: 0, y: 0 }, 8.05)
tl.to('#reply-caret', { opacity: 1, duration: 0.15, ease: 'power1.out' }, 8.05)

const TYPED = 'i have plans'
let caretX = 0
for (let i = 0; i < TYPED.length; i++) {
  const t = 8.25 + i * 0.085
  tl.to(
    '#reply-rough .char:nth-child(' + (i + 1) + ')',
    { opacity: 1, duration: 0.06, ease: 'none' },
    t
  )
  const ch = TYPED[i]
  let w = 16
  if (ch === ' ') w = 9
  else if (ch === 'i' || ch === 'l') w = 8
  else if (ch === 'n' || ch === 'o' || ch === 'a' || ch === 'e' || ch === 's')
    w = 19
  else if (ch === 'h' || ch === 'p' || ch === 'v') w = 20
  caretX += w
  tl.to('#reply-caret', { x: caretX, duration: 0.07, ease: 'none' }, t)
}
// Typing ends ~9.55. Caret blinks while we sit on the bare reply.
tl.to(
  '#reply-caret',
  {
    opacity: 0,
    duration: 0.45,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: 4
  },
  9.6
)

// ====================================================================
// SCENE 4 — HOLD on bare reply, then SW BUTTON APPEARS + CURSOR MOVES
// ====================================================================
tl.to(
  '#fab',
  { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' },
  11.1
)
tl.to(
  '#cursor',
  {
    x: SW_BUTTON_CX - 16,
    y: SW_BUTTON_CY - 18,
    duration: 0.95,
    ease: 'power2.inOut'
  },
  11.6
)

// ====================================================================
// SCENE 5 — CLICK SIMPLE WORDS
// ====================================================================
tl.to('#fab', { scale: 0.94, duration: 0.1, ease: 'power2.out' }, 12.6)
tl.to('#fab', { scale: 1.0, duration: 0.18, ease: 'power2.out' }, 12.7)
tl.to('#cursor', { scale: 0.92, duration: 0.1, ease: 'power2.out' }, 12.6)
tl.to('#cursor', { scale: 1.0, duration: 0.18, ease: 'power2.out' }, 12.7)

tl.set('#click-ring', { x: SW_BUTTON_CX, y: SW_BUTTON_CY, scale: 0, opacity: 1 }, 12.63)
tl.to(
  '#click-ring',
  { scale: 2.4, opacity: 0, duration: 0.55, ease: 'power2.out' },
  12.63
)

for (let i = 0; i < 8; i++) {
  const off = SPARKLE_OFFS[i]
  const id = '#sp-' + (i + 1)
  tl.set(id, { x: SW_BUTTON_CX, y: SW_BUTTON_CY, scale: 0, opacity: 0 }, 12.63)
  tl.to(
    id,
    {
      x: SW_BUTTON_CX + off.x,
      y: SW_BUTTON_CY + off.y,
      scale: 1,
      opacity: 1,
      duration: 0.22,
      ease: 'power2.out'
    },
    12.65 + i * 0.012
  )
  tl.to(
    id,
    {
      x: SW_BUTTON_CX + off.x * 1.45,
      y: SW_BUTTON_CY + off.y * 1.45,
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power1.in'
    },
    12.89 + i * 0.012
  )
}

tl.to(
  '#fab',
  { backgroundColor: '#2747D6', duration: 0.25, ease: 'power2.inOut' },
  12.8
)
tl.set('#fab', { autoAlpha: 0 }, 12.9)

// ====================================================================
// SCENE 6 — PANEL APPEARS + LOADING
// ====================================================================
tl.fromTo(
  '#panel',
  { autoAlpha: 0, y: 24, scale: 0.98 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' },
  12.9
)
tl.to(
  '#panel-loading-svg',
  {
    rotation: 360,
    duration: 0.95,
    ease: 'none',
    transformOrigin: 'center center'
  },
  13.0
)

// ====================================================================
// SCENE 7 — REFINED DRAFT REVEALS (longer copy now)
// ====================================================================
tl.to(
  '#panel-loading',
  {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    duration: 0.3,
    ease: 'power2.in'
  },
  14.0
)
tl.to(
  '#panel-line-1',
  { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
  14.15
)
tl.to(
  '#panel-line-2',
  { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
  14.35
)
tl.to(
  '#panel-line-3',
  { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
  14.7
)
tl.to(
  '#panel-line-4',
  { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
  14.9
)
tl.to(
  '#panel-actions',
  { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' },
  15.15
)

// ====================================================================
// SCENE 8 — HOLD reading refined draft (~3s), then CURSOR -> REPLACE
// ====================================================================
tl.to(
  '#cursor',
  {
    x: REPLACE_CX - 16,
    y: REPLACE_CY - 18,
    duration: 0.95,
    ease: 'power2.inOut'
  },
  18.4
)
tl.to('#cursor', { scale: 0.92, duration: 0.1, ease: 'power2.out' }, 19.35)
tl.to('#cursor', { scale: 1.0, duration: 0.18, ease: 'power2.out' }, 19.46)
tl.set(
  '#click-ring',
  { x: REPLACE_CX, y: REPLACE_CY, scale: 0, opacity: 1 },
  19.35
)
tl.to(
  '#click-ring',
  { scale: 2.0, opacity: 0, duration: 0.5, ease: 'power2.out' },
  19.35
)

// ====================================================================
// SCENE 9 — REPLY EDITOR SWAPS
// ====================================================================
tl.to(
  '#reply-rough',
  { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in' },
  19.5
)
tl.to('#reply-caret', { opacity: 0, duration: 0.2, ease: 'power2.in' }, 19.5)
tl.to(
  '#panel',
  {
    autoAlpha: 0,
    y: -16,
    scale: 0.98,
    duration: 0.45,
    ease: 'power2.inOut'
  },
  19.55
)
tl.fromTo(
  '#reply-refined',
  { opacity: 0, y: 8 },
  { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
  19.8
)
// ====================================================================
// SCENE 10 — HOLD seeing the new draft, then CURSOR -> SEND
// ====================================================================
tl.to(
  '#cursor',
  {
    x: SEND_CX - 16,
    y: SEND_CY - 18,
    duration: 0.85,
    ease: 'power2.inOut'
  },
  22.2
)
tl.to('#cursor', { scale: 0.92, duration: 0.1, ease: 'power2.out' }, 23.05)
tl.to('#cursor', { scale: 1.0, duration: 0.18, ease: 'power2.out' }, 23.16)
tl.to(
  '#reply-send',
  {
    scale: 0.96,
    duration: 0.1,
    ease: 'power2.out',
    transformOrigin: 'center center'
  },
  23.05
)
tl.to('#reply-send', { scale: 1.0, duration: 0.18, ease: 'power2.out' }, 23.16)
tl.set('#click-ring', { x: SEND_CX, y: SEND_CY, scale: 0, opacity: 1 }, 23.05)
tl.to(
  '#click-ring',
  { scale: 1.8, opacity: 0, duration: 0.45, ease: 'power2.out' },
  23.05
)

// ====================================================================
// SCENE 11 — SEND LIFTOFF
// ====================================================================
tl.to(
  '#mail-content',
  {
    opacity: 0,
    y: -180,
    scale: 0.98,
    duration: 0.85,
    ease: 'power2.in',
    transformOrigin: 'center center'
  },
  23.3
)
tl.to('#cursor', { opacity: 0, duration: 0.4, ease: 'power2.in' }, 23.45)

const trailOffsets = [
  { x: -30, y: -60 },
  { x: 10, y: -110 },
  { x: -10, y: -180 },
  { x: 30, y: -240 },
  { x: 0, y: -300 }
]
for (let i = 0; i < trailOffsets.length; i++) {
  const off = trailOffsets[i]
  const id = '#st-' + (i + 1)
  tl.set(id, { x: SEND_CX, y: SEND_CY, scale: 0, opacity: 0 }, 23.25)
  tl.to(
    id,
    {
      x: SEND_CX + off.x,
      y: SEND_CY + off.y,
      scale: 1,
      opacity: 0.9,
      duration: 0.3,
      ease: 'power2.out'
    },
    23.3 + i * 0.05
  )
  tl.to(
    id,
    {
      y: SEND_CY + off.y - 80,
      scale: 0,
      opacity: 0,
      duration: 0.55,
      ease: 'power1.in'
    },
    23.6 + i * 0.05
  )
}

// ====================================================================
// TRANSITION — wipe down
// ====================================================================
tl.set('#wipe', { y: '-100%' }, 24.2)
tl.to('#wipe', { y: '0%', duration: 0.3, ease: 'power3.in' }, 24.2)
tl.set('#chrome', { opacity: 0 }, 24.51)
tl.set('#outro', { opacity: 1 }, 24.51)
tl.to(
  '#wipe',
  { y: '100%', duration: 0.32, ease: 'power3.out', overwrite: 'auto' },
  24.53
)

// ====================================================================
// SCENE 12 — OUTRO
// ====================================================================
tl.to(
  '#outro-glyph',
  { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
  24.75
)
tl.to(
  '#outro-wordmark',
  { opacity: 1, y: 0, duration: 0.65, ease: 'expo.out' },
  24.95
)
tl.to(
  '#outro-tag',
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  25.2
)
tl.to(
  '#outro-cta',
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  25.5
)
tl.to(
  '#outro-glyph',
  { y: -6, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 },
  25.7
)

window.__timelines['main'] = tl
