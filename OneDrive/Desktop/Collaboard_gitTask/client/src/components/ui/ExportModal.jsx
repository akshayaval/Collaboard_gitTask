// ExportModal.jsx — PNG/PDF export dialog

import React, { useState } from 'react'
import { exportPNG, exportPDF } from '../../lib/exportUtils'

export default function ExportModal({ canvases, onClose }) {
  const [format, setFormat] = useState('png')
  const [filename, setFilename] = useState('collaboard-export')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const fullName = `${filename}.${format}`
      if (format === 'png') {
        exportPNG(canvases, fullName)
      } else {
        await exportPDF(canvases, fullName)
      }
      onClose()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Export Canvas</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Download a snapshot of the current canvas
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Format selector */}
        <div style={{ marginBottom: 20 }}>
          <label className="label-xs" style={{ display: 'block', marginBottom: 10 }}>Format</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['png', 'pdf'].map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 'var(--radius)',
                  border: `2px solid ${format === f ? 'var(--primary)' : 'var(--border-2)'}`,
                  background: format === f ? 'var(--primary-ghost)' : 'var(--surface-2)',
                  color: format === f ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  transition: 'all var(--transition)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {f === 'png' ? (
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                ) : (
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8m8 4H8m2-8H8"/></svg>
                )}
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Filename */}
        <div style={{ marginBottom: 24 }}>
          <label className="label-xs" style={{ display: 'block', marginBottom: 8 }}>Filename</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <input
              type="text"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              style={{ border: 'none', flex: 1, background: 'transparent', borderRadius: 0 }}
            />
            <span style={{
              padding: '10px 14px',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              borderLeft: '1px solid var(--border-2)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--surface-3)',
            }}>
              .{format}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
            style={{ flex: 2 }}
          >
            {exporting ? (
              <>
                <svg width="14" height="14" style={{ animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-18 0"/></svg>
                Exporting…
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
