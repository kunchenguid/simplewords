/* global React */
const { useState, useEffect, useRef } = React

// ====== ICONS ======

const IconSparkles = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
)

const IconLoader = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

const IconCheck = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

// ====== FLOATING BUTTON ======

function FloatingButton({
  onClick,
  top,
  left,
  working = false,
  label = 'Simple Words'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className={`sw-fab ${working ? 'sw-fab--working' : ''}`}
      style={{ top, left }}
      aria-label={label}
    >
      {working ? (
        <IconLoader style={{ animation: 'sw-spin 1s linear infinite' }} />
      ) : (
        <IconSparkles />
      )}
      {working ? 'Refining' : label}
    </button>
  )
}

// ====== REFINE PANEL ======

function RefinePanel({
  state,
  message,
  replacement,
  onReplace,
  onDismiss,
  top,
  left
}) {
  return (
    <div
      className="sw-panel"
      style={{ top, left }}
      role="dialog"
      aria-label="Simple Words refinement"
    >
      <div className="sw-panel__head">
        <IconSparkles />
        <span>{state === 'loading' ? 'Refining draft' : 'Refined draft'}</span>
      </div>
      {state === 'loading' ? (
        <div className="sw-panel__loading">
          <IconLoader />
          <span>{message ?? 'Refining...'}</span>
        </div>
      ) : (
        <>
          <div className="sw-panel__body">{message ?? replacement}</div>
          {replacement && (
            <div className="sw-panel__actions">
              <button className="sw-btn sw-btn--primary" onClick={onReplace}>
                Replace draft
              </button>
              <button className="sw-btn sw-btn--ghost" onClick={onDismiss}>
                Dismiss
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

window.IconSparkles = IconSparkles
window.IconLoader = IconLoader
window.IconCheck = IconCheck
window.FloatingButton = FloatingButton
window.RefinePanel = RefinePanel
