// ColorPalette.jsx — Pixel art palette + guided/free mode toggle

import React from 'react'
import { TEMPLATE_LIST } from '../../lib/pixelTemplates'
import styles from './ColorPalette.module.css'

export default function ColorPalette({ pa, onExport }) {
  const {
    state,
    setGuidedMode,
    setPaletteSelection,
    setFreeColor,
    setTemplate,
  } = pa
  const { template, guidedMode, paletteSelection, freeColor, cellStates } = state

  // Progress calculation
  const totalFillable = template?.cells.filter(c => c.number > 0).length || 0
  const filled = cellStates.size
  const progress = totalFillable ? Math.round((filled / totalFillable) * 100) : 0

  return (
    <div className={styles.palette}>
      {/* Template selector */}
      <div className={styles.section}>
        <span className="label-xs" style={{ display: 'block', marginBottom: 8 }}>Template</span>
        <select
          value={state.templateId}
          onChange={e => setTemplate(e.target.value)}
          style={{ fontSize: '0.8125rem' }}
        >
          {TEMPLATE_LIST.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.divider} />

      {/* Mode toggle */}
      <div className={styles.section}>
        <span className="label-xs" style={{ display: 'block', marginBottom: 8 }}>Fill Mode</span>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${guidedMode ? styles.modeBtnActive : ''}`}
            onClick={() => setGuidedMode(true)}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Guided
          </button>
          <button
            className={`${styles.modeBtn} ${!guidedMode ? styles.modeBtnActive : ''}`}
            onClick={() => setGuidedMode(false)}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
            Free
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
          {guidedMode
            ? 'Click a cell to apply its assigned palette color.'
            : 'Any color applied to any cell.'}
        </p>
      </div>

      <div className={styles.divider} />

      {/* Color section */}
      {guidedMode ? (
        <div className={styles.section}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 8 }}>Palette</span>
          <div className={styles.paletteList}>
            {template?.palette.map(entry => (
              <button
                key={entry.number}
                className={`${styles.paletteEntry} ${paletteSelection === entry.number ? styles.paletteEntryActive : ''}`}
                onClick={() => setPaletteSelection(entry.number)}
              >
                <div className={styles.paletteColor} style={{ background: entry.color }} />
                <span className={styles.paletteNum}>{entry.number}</span>
                <span className={styles.paletteLabel}>{entry.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 8 }}>Color</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={freeColor}
              onChange={e => setFreeColor(e.target.value)}
              style={{ width: 48, height: 40, padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{freeColor}</span>
          </div>
        </div>
      )}

      <div className={styles.divider} />

      {/* Progress */}
      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="label-xs">Progress</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{progress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
          {filled} / {totalFillable} cells filled
        </p>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <button className="btn btn-ghost" onClick={onExport} style={{ width: '100%', fontSize: '0.8125rem' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>
    </div>
  )
}
