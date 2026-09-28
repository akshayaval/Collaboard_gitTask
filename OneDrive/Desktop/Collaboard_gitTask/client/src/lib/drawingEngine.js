// drawingEngine.js — Pure canvas drawing functions (no React/state)

export const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
  STICKY: 'sticky',
  SELECT: 'select',
}

/** Draw a complete action onto a canvas context */
export function renderAction(ctx, action) {
  if (!action) return
  ctx.save()

  switch (action.type) {
    case 'stroke':
      renderStroke(ctx, action)
      break
    case 'erase':
      renderErase(ctx, action)
      break
    case 'rect':
      renderRect(ctx, action)
      break
    case 'ellipse':
      renderEllipse(ctx, action)
      break
    case 'line':
      renderLine(ctx, action)
      break
    case 'arrow':
      renderArrow(ctx, action)
      break
    case 'text':
      renderText(ctx, action)
      break
    case 'sticky':
      renderSticky(ctx, action)
      break
    default:
      break
  }

  ctx.restore()
}

/** Render all actions onto a context */
export function renderAllActions(ctx, actions, width, height, excludeId = null) {
  ctx.clearRect(0, 0, width, height)
  for (const action of actions) {
    if (action.id !== excludeId) renderAction(ctx, action)
  }
}

function renderStroke(ctx, action) {
  const pts = action.points
  if (!pts || pts.length < 2) {
    if (pts && pts.length === 1) {
      ctx.beginPath()
      ctx.arc(pts[0].x, pts[0].y, action.width / 2, 0, Math.PI * 2)
      ctx.fillStyle = action.color
      ctx.fill()
    }
    return
  }
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  ctx.strokeStyle = action.color
  ctx.lineWidth = action.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function renderErase(ctx, action) {
  ctx.globalCompositeOperation = 'destination-out'
  ctx.strokeStyle = 'rgba(0,0,0,1)'
  ctx.lineWidth = action.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const pts = action.points
  if (!pts || pts.length < 1) return
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
}

function renderRect(ctx, action) {
  const { x, y, w, h, color, width, fill, fillColor } = action
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (fill) {
    ctx.fillStyle = fillColor || color + '33'
    ctx.fillRect(x, y, w, h)
  }
  ctx.strokeRect(x, y, w, h)
}

function renderEllipse(ctx, action) {
  const { x, y, rx, ry, color, width, fill, fillColor } = action
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
  if (fill) {
    ctx.fillStyle = fillColor || color + '33'
    ctx.fill()
  }
  ctx.stroke()
}

function renderLine(ctx, action) {
  const { x1, y1, x2, y2, color, width } = action
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

function renderArrow(ctx, action) {
  const { x1, y1, x2, y2, color, width } = action
  const headLen = Math.max(12, width * 3)
  const angle = Math.atan2(y2 - y1, x2 - x1)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'

  // Shaft
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2 - Math.cos(angle) * headLen * 0.5, y2 - Math.sin(angle) * headLen * 0.5)
  ctx.stroke()

  // Arrowhead
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 7), y2 - headLen * Math.sin(angle - Math.PI / 7))
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 7), y2 - headLen * Math.sin(angle + Math.PI / 7))
  ctx.closePath()
  ctx.fill()
}

function renderText(ctx, action) {
  const { x, y, text, color, fontSize, fontWeight } = action
  ctx.font = `${fontWeight || 500} ${fontSize || 18}px Inter, sans-serif`
  ctx.fillStyle = color
  ctx.textBaseline = 'top'

  const lines = text.split('\n')
  const lh = (fontSize || 18) * 1.5
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lh)
  })
}

const STICKY_W = 200
const STICKY_H = 160
const STICKY_FOLD = 20

function renderSticky(ctx, action) {
  const { x, y, text, bgColor, textColor, fontSize } = action
  const w = STICKY_W, h = STICKY_H, fold = STICKY_FOLD

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 4

  // Main body
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w - fold, y)
  ctx.lineTo(x + w, y + fold)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fillStyle = bgColor || '#FEF08A'
  ctx.fill()

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Folded corner
  ctx.beginPath()
  ctx.moveTo(x + w - fold, y)
  ctx.lineTo(x + w - fold, y + fold)
  ctx.lineTo(x + w, y + fold)
  ctx.closePath()
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fill()

  // Text
  if (text) {
    const fs = fontSize || 14
    ctx.font = `500 ${fs}px Inter, sans-serif`
    ctx.fillStyle = textColor || '#1a1a2e'
    ctx.textBaseline = 'top'
    const pad = 12
    const maxW = w - pad * 2 - fold
    const lh = fs * 1.5
    const lines = wrapText(ctx, text, maxW)
    const maxLines = Math.floor((h - pad * 2) / lh)
    lines.slice(0, maxLines).forEach((line, i) => {
      ctx.fillText(line, x + pad, y + pad + i * lh)
    })
  }
}

export { STICKY_W, STICKY_H }

function wrapText(ctx, text, maxW) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  // Also split on newlines
  return lines.flatMap(l => l.split('\n'))
}

/** Draw the background dot grid */
export function drawGrid(ctx, width, height, dotColor = 'rgba(255,255,255,0.06)', spacing = 28) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = dotColor
  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath()
      ctx.arc(x, y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Get canvas position from mouse/touch event */
export function getCanvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

/** Hit test for select tool */
export function hitTestAction(action, px, py) {
  const TOLERANCE = 8
  switch (action.type) {
    case 'stroke':
    case 'erase': {
      const pts = action.points
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < TOLERANCE) return true
      }
      return false
    }
    case 'rect': {
      const { x, y, w, h } = action
      const xmin = Math.min(x, x+w), xmax = Math.max(x, x+w)
      const ymin = Math.min(y, y+h), ymax = Math.max(y, y+h)
      return px >= xmin - TOLERANCE && px <= xmax + TOLERANCE && py >= ymin - TOLERANCE && py <= ymax + TOLERANCE
    }
    case 'ellipse': {
      const { x, y, rx, ry } = action
      const nx = (px - x) / (Math.abs(rx) + TOLERANCE)
      const ny = (py - y) / (Math.abs(ry) + TOLERANCE)
      return nx * nx + ny * ny <= 1
    }
    case 'line':
    case 'arrow': {
      return distToSegment(px, py, action.x1, action.y1, action.x2, action.y2) < TOLERANCE
    }
    case 'text': {
      const { x, y, fontSize } = action
      return px >= x - TOLERANCE && py >= y - TOLERANCE && py <= y + (fontSize || 18) + TOLERANCE
    }
    case 'sticky': {
      const { x, y } = action
      return px >= x - TOLERANCE && px <= x + STICKY_W + TOLERANCE &&
             py >= y - TOLERANCE && py <= y + STICKY_H + TOLERANCE
    }
    default:
      return false
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/** Composite multiple canvas elements into one offscreen canvas */
export function compositeCanvases(canvases, width, height) {
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const ctx = offscreen.getContext('2d')
  for (const canvas of canvases) {
    if (canvas) ctx.drawImage(canvas, 0, 0)
  }
  return offscreen
}

const HANDLE_SIZE = 8

export function renderSelectionBounds(ctx, action) {
  if (!action) return
  ctx.save()
  ctx.strokeStyle = '#7C3AED'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.fillStyle = 'white'

  const drawHandle = (hx, hy) => {
    ctx.setLineDash([])
    ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
    ctx.strokeRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
    ctx.setLineDash([4, 4])
  }

  if (action.type === 'rect') {
    const { x, y, w, h } = action
    ctx.strokeRect(x, y, w, h)
    drawHandle(x, y)
    drawHandle(x + w / 2, y)
    drawHandle(x + w, y)
    drawHandle(x + w, y + h / 2)
    drawHandle(x + w, y + h)
    drawHandle(x + w / 2, y + h)
    drawHandle(x, y + h)
    drawHandle(x, y + h / 2)
  } else if (action.type === 'ellipse') {
    const { x, y, rx, ry } = action
    ctx.strokeRect(x - rx, y - ry, rx * 2, ry * 2)
    drawHandle(x - rx, y - ry)
    drawHandle(x, y - ry)
    drawHandle(x + rx, y - ry)
    drawHandle(x + rx, y)
    drawHandle(x + rx, y + ry)
    drawHandle(x, y + ry)
    drawHandle(x - rx, y + ry)
    drawHandle(x - rx, y)
  } else if (action.type === 'line' || action.type === 'arrow') {
    const { x1, y1, x2, y2 } = action
    // Bounding box for line doesn't make sense, just draw the two endpoints
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    drawHandle(x1, y1)
    drawHandle(x2, y2)
  }
  ctx.restore()
}

export function hitTestHandle(action, px, py) {
  if (!action) return null
  const hit = (hx, hy) => Math.abs(px - hx) <= HANDLE_SIZE / 2 + 4 && Math.abs(py - hy) <= HANDLE_SIZE / 2 + 4
  
  if (action.type === 'rect') {
    const { x, y, w, h } = action
    if (hit(x, y)) return 'nw'
    if (hit(x + w / 2, y)) return 'n'
    if (hit(x + w, y)) return 'ne'
    if (hit(x + w, y + h / 2)) return 'e'
    if (hit(x + w, y + h)) return 'se'
    if (hit(x + w / 2, y + h)) return 's'
    if (hit(x, y + h)) return 'sw'
    if (hit(x, y + h / 2)) return 'w'
  } else if (action.type === 'ellipse') {
    const { x, y, rx, ry } = action
    if (hit(x - rx, y - ry)) return 'nw'
    if (hit(x, y - ry)) return 'n'
    if (hit(x + rx, y - ry)) return 'ne'
    if (hit(x + rx, y)) return 'e'
    if (hit(x + rx, y + ry)) return 'se'
    if (hit(x, y + ry)) return 's'
    if (hit(x - rx, y + ry)) return 'sw'
    if (hit(x - rx, y)) return 'w'
  } else if (action.type === 'line' || action.type === 'arrow') {
    const { x1, y1, x2, y2 } = action
    if (hit(x1, y1)) return 'p1'
    if (hit(x2, y2)) return 'p2'
  }
  return null
}
