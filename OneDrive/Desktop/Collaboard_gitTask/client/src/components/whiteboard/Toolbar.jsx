// Toolbar.jsx -- matches reference design exactly

import React, { useState } from 'react'
import { TOOLS } from '../../lib/drawingEngine'
import styles from './Toolbar.module.css'

const TOOLS_CONFIG = [
  {
    id: TOOLS.SELECT,
    label: 'Select',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="#7C3AED" strokeWidth="1.8" strokeDasharray="3.5 2" fill="none"/>
        <path d="M14 13l2 6 1.8-3.2 3.2 0L14 8z" fill="#7C3AED" stroke="#7C3AED" strokeWidth="0.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: TOOLS.PEN,
    label: 'Pen',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <path d="M18 4l4 4-12 12-5 1 1-5L18 4z" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M15 7l4 4" stroke="#EA580C" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M6 20l1-4" stroke="#EA580C" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: TOOLS.RECT,
    label: 'Rectangle',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <rect x="3" y="6" width="20" height="14" rx="2.5" stroke="#0D9488" strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  {
    id: TOOLS.ELLIPSE,
    label: 'Ellipse',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <ellipse cx="13" cy="13" rx="10" ry="8" stroke="#EC4899" strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  {
    id: TOOLS.LINE,
    label: 'Line',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <line x1="5" y1="21" x2="21" y2="5" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: TOOLS.ARROW,
    label: 'Arrow',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <path d="M6 20L20 6" stroke="#0D9488" strokeWidth="2" strokeLinecap="round"/>
        <path d="M20 6l-8 0M20 6l0 8" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: TOOLS.TEXT,
    label: 'Text',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <path d="M5 7h16M13 7v13" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M9 20h8" stroke="#1E293B" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: TOOLS.STICKY,
    label: 'Sticky Note',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5"/>
        <rect x="3" y="13" width="18" height="6" rx="2" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5"/>
        <line x1="7" y1="9" x2="15" y2="9" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="13" y2="12" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: TOOLS.ERASER,
    label: 'Eraser',
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 26 26">
        <path d="M22 19H9" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 19l3 0 9-9-5-5-9 9 2 5z" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M11 5l5 5" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

const PRESET_COLORS = [
  '#60A5FA','#F472B6','#34D399','#FBBF24',
  '#A78BFA','#FB923C','#F87171','#1E293B',
]

const SIZE_STEPS = [2, 4, 8, 14, 22]

export default function Toolbar({ wb, onExport, onShare }) {
  const { state, setTool, setColor, setWidth } = wb
  const [showColorPanel, setShowColorPanel] = useState(false)

  const handleClear = () => {
    if (window.confirm('Clear the entire board?')) wb.clearBoard()
  }

  return (
    <aside className={styles.toolbar}>

      {/* TOOLS */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Tools</p>
        <div className={styles.toolGrid}>
          {TOOLS_CONFIG.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`${styles.toolCell} ${state.tool === id ? styles.toolCellActive : ''}`}
              onClick={() => setTool(id)}
              title={label}
            >
              <span className={styles.toolIconWrap}>{icon}</span>
              <span className={styles.toolLabel}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      {/* COLOR */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Color</p>
        <div className={styles.colorRow}>
          <button
            className={styles.colorWheelBtn}
            onClick={() => setShowColorPanel(v => !v)}
            title="Pick color"
          >
            <svg width="36" height="36" viewBox="0 0 36 36">
              <defs>
                <linearGradient id="cw1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F472B6"/>
                  <stop offset="25%" stopColor="#FBBF24"/>
                  <stop offset="50%" stopColor="#34D399"/>
                  <stop offset="75%" stopColor="#60A5FA"/>
                  <stop offset="100%" stopColor="#A78BFA"/>
                </linearGradient>
              </defs>
              <circle cx="18" cy="18" r="14" fill="none" stroke="url(#cw1)" strokeWidth="5"/>
              <circle cx="18" cy="18" r="7" fill="white"/>
              <path d="M14 21l2-2 1 1 4-5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
          <div
            className={styles.currentColorDot}
            style={{ background: state.color }}
            title={state.color}
          />
        </div>

        {showColorPanel && (
          <div className={styles.colorPanel}>
            <div className={styles.presetGrid}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.preset} ${state.color === c ? styles.presetActive : ''}`}
                  style={{ background: c }}
                  onClick={() => { setColor(c); setShowColorPanel(false) }}
                />
              ))}
            </div>
            <input
              type="color"
              value={state.color}
              onChange={e => setColor(e.target.value)}
              className={styles.colorNative}
            />
          </div>
        )}
      </section>

      <div className={styles.divider} />

      {/* SIZE */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Size</p>
        <div className={styles.sizePreviewBox}>
          <svg width="60" height="28" viewBox="0 0 60 28" fill="none">
            <path
              d={`M4 18 Q14 ${28 - state.width * 0.8} 22 14 Q30 ${state.width} 38 14 Q46 ${28 - state.width * 0.8} 56 10`}
              stroke="#7C3AED"
              strokeWidth={Math.min(state.width / 2 + 1, 5)}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <div className={styles.sizeDots}>
          {SIZE_STEPS.map(w => (
            <button
              key={w}
              className={`${styles.sizeDotBtn} ${state.width === w ? styles.sizeDotActive : ''}`}
              onClick={() => setWidth(w)}
              title={`${w}px`}
            >
              <div
                className={styles.sizeDot}
                style={{
                  width: Math.min(w, 18),
                  height: Math.min(w, 18),
                  background: state.width === w ? '#7C3AED' : '#CBD5E1',
                }}
              />
            </button>
          ))}
        </div>
        <input
          type="range" min="1" max="40" value={state.width}
          onChange={e => setWidth(Number(e.target.value))}
          className={styles.sizeSlider}
        />
        <span className={styles.sizePx}>{state.width}px</span>
      </section>

      <div className={styles.divider} />

      {/* ACTIONS */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Actions</p>
        <div className={styles.actionList}>

          <button className={styles.actionRow} onClick={wb.undo} title="Undo (Ctrl+Z)">
            <span className={styles.actionIcon} style={{ color: '#7C3AED' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
              </svg>
            </span>
            <span className={styles.actionLabel}>Undo</span>
            <span className={styles.actionShortcut}>Ctrl+Z</span>
          </button>

          <button className={styles.actionRow} onClick={wb.redo} title="Redo (Ctrl+Y)">
            <span className={styles.actionIcon} style={{ color: '#0D9488' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
              </svg>
            </span>
            <span className={styles.actionLabel}>Redo</span>
            <span className={styles.actionShortcut}>Ctrl+Y</span>
          </button>

          <button className={styles.actionRow} onClick={handleClear} title="Clear Board">
            <span className={styles.actionIcon} style={{ color: '#EF4444' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </span>
            <span className={styles.actionLabel}>Clear Board</span>
          </button>

          <button className={styles.actionRow} onClick={onExport} title="Export">
            <span className={styles.actionIcon} style={{ color: '#3B82F6' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </span>
            <span className={styles.actionLabel}>Export</span>
          </button>

          <button className={styles.actionRow} onClick={onShare} title="Share Room">
            <span className={styles.actionIcon} style={{ color: '#7C3AED' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </span>
            <span className={styles.actionLabel}>Share Room</span>
          </button>

        </div>
      </section>

    </aside>
  )
}
