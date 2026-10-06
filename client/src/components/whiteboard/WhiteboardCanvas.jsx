// WhiteboardCanvas.jsx — Multi-layer canvas with live drawing

import React, { useEffect, useRef, useCallback } from 'react'
import {
  renderAllActions, renderAction, renderSelectionBounds, drawGrid, getCanvasPos,
  TOOLS, compositeCanvases
} from '../../lib/drawingEngine'
import CursorOverlay from './CursorOverlay'
import styles from './WhiteboardCanvas.module.css'

export default function WhiteboardCanvas({
  wb,             // useWhiteboard hook state + handlers
  userId,
  cursors,        // Map<userId, {x,y,name,color}>
  canvasRefs,     // { grid, content, scratch } — exposed to parent for export
  drawingDisabled, // when true (Skribble observer), all draw interactions are blocked
}) {
  const gridRef    = useRef(null)
  const contentRef = useRef(null)
  const scratchRef = useRef(null)
  const containerRef = useRef(null)

  // Expose canvas refs to parent for export
  useEffect(() => {
    if (canvasRefs) {
      canvasRefs.current = {
        grid: gridRef.current,
        content: contentRef.current,
        scratch: scratchRef.current,
      }
    }
  })

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resize = () => {
      const { offsetWidth: w, offsetHeight: h } = container
      for (const ref of [gridRef, contentRef, scratchRef]) {
        if (ref.current) {
          ref.current.width = w
          ref.current.height = h
        }
      }
      redrawGrid()
      redrawContent()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    return () => ro.disconnect()
  }, [])

  // ── Grid ──────────────────────────────────────────────────────────────────
  const redrawGrid = useCallback(() => {
    const canvas = gridRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawGrid(ctx, canvas.width, canvas.height, 'rgba(0,0,0,0.07)')
  }, [])

  // ── Content (action log) ──────────────────────────────────────────────────
  const redrawContent = useCallback((excludeId = null) => {
    const canvas = contentRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    renderAllActions(ctx, wb.state.actions, canvas.width, canvas.height, excludeId)
  }, [wb.state.actions])

  useEffect(() => { redrawContent() }, [redrawContent])

  // ── Scratch (selection bounds when idle) ─────────────────────────────────
  useEffect(() => {
    const canvas = scratchRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    if (!wb.activeStroke.current && !wb.shapeStart.current && !wb.dragState.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (wb.state.selectedId) {
        const sel = wb.state.actions.find(a => a.id === wb.state.selectedId)
        if (sel) renderSelectionBounds(ctx, sel)
      }
    }
  }, [wb.state.selectedId, wb.state.actions])

  // ── Pointer events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    if (drawingDisabled) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    wb.handlePointerDown(e, scratchRef.current, contentRef.current)
  }, [wb, drawingDisabled])

  const handlePointerMove = useCallback((e) => {
    if (drawingDisabled) return
    wb.handlePointerMove(e, scratchRef.current, contentRef.current)
  }, [wb, drawingDisabled])

  const handlePointerUp = useCallback((e) => {
    if (drawingDisabled) return
    wb.handlePointerUp(e, scratchRef.current, contentRef.current, redrawContent)
  }, [wb, redrawContent, drawingDisabled])

  const handlePointerLeave = useCallback((e) => {
    if (drawingDisabled) return
    if (e.currentTarget?.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      return
    }
    if (wb.activeStroke.current || wb.shapeStart.current) {
      handlePointerUp(e)
    }
  }, [wb, handlePointerUp, drawingDisabled])

  const handleDoubleClick = useCallback((e) => {
    if (drawingDisabled) return
    wb.handleDoubleClick(e, scratchRef.current)
  }, [wb, drawingDisabled])

  const getCursorStyle = () => {
    if (drawingDisabled) return 'not-allowed'
    switch (wb.state.tool) {
      case TOOLS.PEN:    return 'crosshair'
      case TOOLS.ERASER: return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' stroke='white' stroke-width='2' fill='rgba(0,0,0,0.5)'/%3E%3C/svg%3E") 12 12, crosshair`
      case TOOLS.TEXT:   return 'text'
      case TOOLS.STICKY: return 'cell'
      case TOOLS.SELECT: return 'default'
      default:           return 'crosshair'
    }
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas ref={gridRef}    className={styles.layer} style={{ zIndex: 1 }} />
      <canvas ref={contentRef} className={styles.layer} style={{ zIndex: 2 }} />
      <canvas
        ref={scratchRef}
        className={styles.layer}
        style={{ zIndex: 3, cursor: getCursorStyle() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
      <CursorOverlay cursors={cursors} containerRef={containerRef} canvasRef={scratchRef} />
    </div>
  )
}
