// InstructionsPanel.jsx — "How to play" chip & modal for Skribble mode

import React, { useState } from 'react'
import { createPortal } from 'react-dom'

const SKRIBBLE_INSTRUCTIONS = [
  'One drawer, everyone else guesses',
  'Timed rounds — guess before the clock runs out',
  'Current leader is shown with a crown',
  'Winner announced at the end of the game',
]

export default function InstructionsPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        title="How to play Skribble"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.22)',
          borderRadius: 8,
          padding: '4px 10px',
          cursor: 'pointer',
          color: '#7C3AED',
          fontSize: '0.75rem',
          fontWeight: 600,
          transition: 'all 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(139,92,246,0.16)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
        }}
      >
        <span>How to play</span>
      </button>

      {isOpen && createPortal(
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: 440,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px 24px',
              borderRadius: 'var(--radius-lg, 16px)',
              background: 'white',
              boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.15))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  How to Play Skribble
                </h2>
                <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.85rem', marginTop: 4 }}>
                  Game rules & mechanics
                </p>
              </div>
              <button
                className="btn-icon"
                onClick={() => setIsOpen(false)}
                style={{ color: 'var(--text-muted, #64748B)', border: 'none', background: 'none', cursor: 'pointer' }}
                aria-label="Close"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SKRIBBLE_INSTRUCTIONS.map((rule, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius, 10px)',
                    background: 'var(--surface-2, #F5F3EE)',
                    border: '1px solid var(--border, rgba(0,0,0,0.08))',
                    fontSize: '0.875rem',
                    color: 'var(--text, #0f172a)',
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(139,92,246,0.15)',
                      color: '#7C3AED',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsOpen(false)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius, 10px)',
                background: '#7C3AED',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
