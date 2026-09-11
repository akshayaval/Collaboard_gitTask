// WhiteboardCanvas.jsx — Multi-layer canvas with live drawing

import React, { useEffect, useRef, useCallback } from 'react'
import {
  renderAllActions, renderAction, drawGrid, getCanvasPos,
  TOOLS, compositeCanvases
} from '../../lib/drawingEngine'
import CursorOverlay from './CursorOverlay'
import styles from './WhiteboardCanvas.module.css'


export default function WhiteboardCanvas({
  wb,           // useWhiteboard hook state + handlers
  userId,
  cursors,      // Map<userId, {x,y,name,color}>
  canvasRefs,   // { grid, content, scratch } — exposed to parent for export
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

  // ── Scratch (live stroke & shape preview) ─────────────────────────────────
  useEffect(() => {
    const canvas = scratchRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw active freehand stroke
    if (wb.activeStroke.current) {
      renderAction(ctx, wb.activeStroke.current)
    }
    // Draw selection bounds when idle
    if (wb.state.selectedId && !wb.dragState.current) {
      const sel = wb.state.actions.find(a => a.id === wb.state.selectedId)
      if (sel) renderSelectionBounds(ctx, sel)
    }
  })

  // ── Pointer events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    wb.handlePointerDown(e, scratchRef.current)
  }, [wb])

  const handlePointerMove = useCallback((e) => {
    wb.handlePointerMove(e, scratchRef.current)

    // Shape preview on scratch canvas
    const canvas = scratchRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pos = getCanvasPos(e, canvas)
    const { tool, color, width } = wb.stateRef.current
    const shapeStart = wb.shapeStart.current

    if (shapeStart && (tool === TOOLS.RECT || tool === TOOLS.ELLIPSE || tool === TOOLS.LINE || tool === TOOLS.ARROW)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Draw active stroke on scratch too
      if (wb.activeStroke.current) renderAction(ctx, wb.activeStroke.current)

      let preview
      if (tool === TOOLS.RECT) {
        preview = { type: 'rect', x: Math.min(shapeStart.x, pos.x), y: Math.min(shapeStart.y, pos.y), w: Math.abs(pos.x - shapeStart.x), h: Math.abs(pos.y - shapeStart.y), color, width }
      } else if (tool === TOOLS.ELLIPSE) {
        const cx = (shapeStart.x + pos.x) / 2, cy = (shapeStart.y + pos.y) / 2
        preview = { type: 'ellipse', x: cx, y: cy, rx: Math.abs(pos.x - shapeStart.x) / 2, ry: Math.abs(pos.y - shapeStart.y) / 2, color, width }
      } else if (tool === TOOLS.LINE) {
        preview = { type: 'line', x1: shapeStart.x, y1: shapeStart.y, x2: pos.x, y2: pos.y, color, width }
      } else if (tool === TOOLS.ARROW) {
        preview = { type: 'arrow', x1: shapeStart.x, y1: shapeStart.y, x2: pos.x, y2: pos.y, color, width }
      }
      if (preview) renderAction(ctx, preview)
    } else if (tool === TOOLS.SELECT && wb.dragState.current) {
      // Drag/resize logic
      const drag = wb.dragState.current
      const init = drag.initialAction
      const dx = pos.x - drag.startPos.x
      const dy = pos.y - drag.startPos.y
      
      let newAction = { ...init }
      
      if (drag.type === 'move') {
        if (init.type === 'rect' || init.type === 'ellipse' || init.type === 'text') {
          newAction.x = init.x + dx
          newAction.y = init.y + dy
        } else if (init.type === 'line' || init.type === 'arrow') {
          newAction.x1 = init.x1 + dx
          newAction.y1 = init.y1 + dy
          newAction.x2 = init.x2 + dx
          newAction.y2 = init.y2 + dy
        } else if (init.type === 'stroke' || init.type === 'erase') {
          newAction.points = init.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        }
      } else if (drag.type === 'resize') {
        if (init.type === 'rect') {
          if (drag.handle.includes('w')) { newAction.x = init.x + dx; newAction.w = init.w - dx }
          if (drag.handle.includes('e')) newAction.w = init.w + dx
          if (drag.handle.includes('n')) { newAction.y = init.y + dy; newAction.h = init.h - dy }
          if (drag.handle.includes('s')) newAction.h = init.h + dy
          // Fix negative w/h
          if (newAction.w < 0) { newAction.x += newAction.w; newAction.w = Math.abs(newAction.w) }
          if (newAction.h < 0) { newAction.y += newAction.h; newAction.h = Math.abs(newAction.h) }
        } else if (init.type === 'ellipse') {
          if (drag.handle.includes('w')) { newAction.x = init.x + dx/2; newAction.rx = Math.max(1, init.rx - dx/2) }
          if (drag.handle.includes('e')) { newAction.x = init.x + dx/2; newAction.rx = Math.max(1, init.rx + dx/2) }
          if (drag.handle.includes('n')) { newAction.y = init.y + dy/2; newAction.ry = Math.max(1, init.ry - dy/2) }
          if (drag.handle.includes('s')) { newAction.y = init.y + dy/2; newAction.ry = Math.max(1, init.ry + dy/2) }
        } else if (init.type === 'line' || init.type === 'arrow') {
          if (drag.handle === 'p1') { newAction.x1 = init.x1 + dx; newAction.y1 = init.y1 + dy }
          if (drag.handle === 'p2') { newAction.x2 = init.x2 + dx; newAction.y2 = init.y2 + dy }
        }
      }
      
      // Update local state directly so it persists
      wb.updateAction(newAction)
      
      // Draw everything on scratch
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      renderAction(ctx, newAction)
      renderSelectionBounds(ctx, newAction)
      
      // Hide from main content canvas temporarily to avoid drawing it twice
      redrawContent(init.id)
    }

  }, [wb])

  const handlePointerUp = useCallback((e) => {
    wb.handlePointerUp(e, scratchRef.current)
    redrawContent() // Ensure it's redrawn on main canvas
    // Clear scratch after finalizing
    const canvas = scratchRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [wb])

  const handleDoubleClick = useCallback((e) => {
    wb.handleDoubleClick(e, scratchRef.current)
  }, [wb])

  const getCursorStyle = () => {
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
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
      <CursorOverlay cursors={cursors} containerRef={containerRef} canvasRef={scratchRef} />
    </div>
  )
}
