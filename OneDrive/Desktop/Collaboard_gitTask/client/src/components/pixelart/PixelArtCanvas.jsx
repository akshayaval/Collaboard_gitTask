// PixelArtCanvas.jsx — Pixel art grid renderer

import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import styles from './PixelArtCanvas.module.css'

const CELL_SIZE = 28 // px per cell at base scale
const NUMBER_THRESHOLD = 18 // min cell size to show numbers

export default function PixelArtCanvas({ pa, canvasRef: externalCanvasRef }) {
  const { state, handleCellClick } = pa
  const { template, cellStates } = state

  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  // Expose canvas for export
  useEffect(() => {
    if (externalCanvasRef) externalCanvasRef.current = canvasRef.current
  })

  const cellSize = useMemo(() => {
    if (!template) return CELL_SIZE
    const container = containerRef.current
    if (!container) return CELL_SIZE
    const maxW = container.offsetWidth / template.cols
    const maxH = container.offsetHeight / template.rows
    return Math.max(8, Math.min(48, Math.floor(Math.min(maxW, maxH))))
  }, [template, containerRef.current?.offsetWidth, containerRef.current?.offsetHeight])

  // Draw everything on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !template) return
    const ctx = canvas.getContext('2d')
    const cs = cellSize
    const { cols, rows, cells, palette } = template

    canvas.width = cols * cs
    canvas.height = rows * cs

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const cell of cells) {
      const x = cell.col * cs
      const y = cell.row * cs
      const filled = cellStates.get(String(cell.id))

      if (filled) {
        ctx.fillStyle = filled.color
      } else if (cell.number === 0) {
        ctx.fillStyle = 'transparent'
      } else {
        // Very faint base color hint
        const paletteEntry = palette.find(p => p.number === cell.number)
        ctx.fillStyle = paletteEntry ? paletteEntry.color + '18' : '#1F2937'
      }
      ctx.fillRect(x, y, cs, cs)

      // Cell border
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x + 0.25, y + 0.25, cs - 0.5, cs - 0.5)

      // Number label (only if cell is large enough and not filled)
      if (!filled && cell.number > 0 && cs >= NUMBER_THRESHOLD) {
        const paletteEntry = palette.find(p => p.number === cell.number)
        ctx.font = `600 ${Math.max(8, cs * 0.35)}px Inter, sans-serif`
        ctx.fillStyle = paletteEntry ? paletteEntry.color + 'BB' : 'rgba(255,255,255,0.4)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(cell.number), x + cs / 2, y + cs / 2)
      }
    }
  }, [template, cellStates, cellSize])

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas || !template) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const cs = cellSize
    const col = Math.floor(px / cs)
    const row = Math.floor(py / cs)
    const cell = template.cells.find(c => c.col === col && c.row === row)
    if (cell && cell.number !== 0) {
      handleCellClick(cell)
    }
  }, [template, handleCellClick, cellSize])

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleClick}
          style={{ cursor: 'crosshair' }}
        />
      </div>
    </div>
  )
}
