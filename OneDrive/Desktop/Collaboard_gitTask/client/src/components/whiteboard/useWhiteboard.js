// useWhiteboard.js — Drawing state + action log hook

import { useReducer, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TOOLS, STICKY_W, STICKY_H, renderAllActions, renderAction, drawGrid, getCanvasPos, hitTestAction, hitTestHandle } from '../../lib/drawingEngine'

const initialState = {
  actions: [],
  tool: TOOLS.PEN,
  color: '#60A5FA',
  width: 4,
  fontSize: 18,
  selectedId: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TOOL':    return { ...state, tool: action.payload }
    case 'SET_COLOR':   return { ...state, color: action.payload }
    case 'SET_WIDTH':   return { ...state, width: action.payload }
    case 'SET_FONTSIZE':return { ...state, fontSize: action.payload }
    case 'ADD_ACTION':  return { ...state, actions: [...state.actions, action.payload] }
    case 'UPDATE_ACTION': {
      const actions = state.actions.map(a => a.id === action.payload.id ? action.payload : a)
      return { ...state, actions }
    }
    case 'SET_SELECTED': return { ...state, selectedId: action.payload }
    case 'SYNC_ACTIONS':   return { ...state, actions: action.payload }
    case 'SYNC_ACTIONS_FN': return { ...state, actions: action.updater(state.actions) }
    case 'UNDO': {
      const userId = action.payload
      const actions = [...state.actions]
      for (let i = actions.length - 1; i >= 0; i--) {
        if (actions[i].userId === userId) {
          actions.splice(i, 1)
          return { ...state, actions }
        }
      }
      return state
    }
    default: return state
  }
}

export function useWhiteboard(socketRef, userIdRef, canvasRefs) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  // Convenience: emit via the ref
  const emit = useCallback((event, data) => {
    socketRef?.current?.emit(event, data)
  }, [socketRef])

  // Active stroke tracking (for streaming freehand)
  const activeStroke = useRef(null)
  // Shape/text drag tracking
  const shapeStart = useRef(null)
  // Text editing
  const textInput = useRef(null)
  // Select drag/resize state
  const dragState = useRef(null) // { type, handle, startPos, initialAction }
  // Redo stack
  const redoStack = useRef([])
  // Cursor throttle
  const lastCursorEmit = useRef(0)
  const CURSOR_THROTTLE = 32 // ~30fps

  const setTool  = useCallback(t => dispatch({ type: 'SET_TOOL', payload: t }), [])
  const setColor = useCallback(c => dispatch({ type: 'SET_COLOR', payload: c }), [])
  const setWidth = useCallback(w => dispatch({ type: 'SET_WIDTH', payload: w }), [])
  const setFontSize = useCallback(s => dispatch({ type: 'SET_FONTSIZE', payload: s }), [])

  const addAction = useCallback((action) => {
    redoStack.current = [] // new action invalidates redo history
    dispatch({ type: 'ADD_ACTION', payload: action })
  }, [])

  const updateAction = useCallback((action) => {
    dispatch({ type: 'UPDATE_ACTION', payload: action })
  }, [])

  const syncActions = useCallback((actionsOrUpdater) => {
    if (typeof actionsOrUpdater === 'function') {
      // Functional update — compute new array from current state
      dispatch({ type: 'SYNC_ACTIONS_FN', updater: actionsOrUpdater })
    } else {
      dispatch({ type: 'SYNC_ACTIONS', payload: actionsOrUpdater })
    }
  }, [])

  const undo = useCallback(() => {
    const { actions } = stateRef.current
    const uid = userIdRef.current
    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].userId === uid) {
        redoStack.current.push(actions[i])
        const newActions = [...actions.slice(0, i), ...actions.slice(i + 1)]
        dispatch({ type: 'SYNC_ACTIONS', payload: newActions })
        emit('action:undo')
        return
      }
    }
  }, [userIdRef, emit])

  const redo = useCallback(() => {
    if (!redoStack.current.length) return
    const action = redoStack.current.pop()
    dispatch({ type: 'ADD_ACTION', payload: action })
    // Re-emit so others see the redo'd action
    if (action.type === 'stroke' || action.type === 'erase') {
      emit('shape:add', { action })
    } else if (action.type === 'text') {
      emit('text:add', { action })
    } else {
      emit('shape:add', { action })
    }
  }, [emit])

  const clearBoard = useCallback(() => {
    redoStack.current = []
    dispatch({ type: 'SYNC_ACTIONS', payload: [] })
    emit('whiteboard:clear')
  }, [emit])

  // Called on every pointer down on canvas
  const handlePointerDown = useCallback((e, canvas) => {
    const { tool, color, width, fontSize } = stateRef.current
    const pos = getCanvasPos(e, canvas)
    canvas.setPointerCapture(e.pointerId)

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const actionId = uuidv4()
      const action = {
        id: actionId,
        type: tool === TOOLS.ERASER ? 'erase' : 'stroke',
        points: [pos],
        color: tool === TOOLS.ERASER ? '#000000' : color,
        width: tool === TOOLS.ERASER ? width * 3 : width,
        userId: userIdRef.current,
        ts: Date.now(),
      }
      activeStroke.current = action
      emit('draw:start', { actionId, point: pos, color: action.color, width: action.width, tool })

    } else if (tool === TOOLS.RECT || tool === TOOLS.ELLIPSE || tool === TOOLS.LINE || tool === TOOLS.ARROW) {
      shapeStart.current = { ...pos, color, width }

    } else if (tool === TOOLS.TEXT) {
      showTextInput(pos, color, fontSize, canvas)

    } else if (tool === TOOLS.STICKY) {
      showStickyInput(pos, color, canvas)

    } else if (tool === TOOLS.SELECT) {
      const { actions, selectedId } = stateRef.current
      
      // 1. Check if clicking on resize handles of currently selected object
      if (selectedId) {
        const selObj = actions.find(a => a.id === selectedId)
        if (selObj) {
          const handle = hitTestHandle(selObj, pos.x, pos.y)
          if (handle) {
            dragState.current = { type: 'resize', handle, startPos: pos, initialAction: { ...selObj } }
            return
          }
        }
      }

      // 2. Find topmost action to select/move
      let hitId = null
      for (let i = actions.length - 1; i >= 0; i--) {
        if (hitTestAction(actions[i], pos.x, pos.y)) {
          hitId = actions[i].id
          dragState.current = { type: 'move', startPos: pos, initialAction: { ...actions[i] } }
          break
        }
      }
      
      if (hitId !== selectedId) {
        dispatch({ type: 'SET_SELECTED', payload: hitId })
      }
      if (!hitId) {
        dragState.current = null
      }
    }
  }, [userIdRef, emit])

  const handlePointerMove = useCallback((e, canvas) => {
    const { tool } = stateRef.current
    const pos = getCanvasPos(e, canvas)

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      if (!activeStroke.current) return
      activeStroke.current.points.push(pos)
      socketRef?.current?.emit('draw:move', { actionId: activeStroke.current.id, point: pos })

    } else if (shapeStart.current) {
      // Will be rendered on scratch canvas by WhiteboardCanvas
    } else if (tool === TOOLS.SELECT && dragState.current) {
      // Logic runs in WhiteboardCanvas on scratch to avoid React state thrashing
    }

    // Throttled cursor broadcast
    const now = Date.now()
    if (now - lastCursorEmit.current > CURSOR_THROTTLE) {
      lastCursorEmit.current = now
      socketRef?.current?.emit('cursor:move', { x: pos.x, y: pos.y })
    }
  }, [socketRef])

  const handlePointerUp = useCallback((e, canvas) => {
    const { tool, color, width } = stateRef.current
    const pos = getCanvasPos(e, canvas)

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      if (!activeStroke.current) return
      const action = { ...activeStroke.current }
      activeStroke.current = null
      addAction(action)
      emit('draw:end', { actionId: action.id })

    } else if (tool === TOOLS.RECT && shapeStart.current) {
      const { x: sx, y: sy, color: sc, width: sw } = shapeStart.current
      const action = {
        id: uuidv4(), type: 'rect',
        x: Math.min(sx, pos.x), y: Math.min(sy, pos.y),
        w: Math.abs(pos.x - sx), h: Math.abs(pos.y - sy),
        color: sc, width: sw, fill: false, userId: userIdRef.current, ts: Date.now(),
      }
      shapeStart.current = null
      addAction(action)
      emit('shape:add', { action })

    } else if (tool === TOOLS.ELLIPSE && shapeStart.current) {
      const { x: sx, y: sy } = shapeStart.current
      const cx = (sx + pos.x) / 2, cy = (sy + pos.y) / 2
      const action = {
        id: uuidv4(), type: 'ellipse',
        x: cx, y: cy,
        rx: Math.abs(pos.x - sx) / 2, ry: Math.abs(pos.y - sy) / 2,
        color, width, fill: false, userId: userIdRef.current, ts: Date.now(),
      }
      shapeStart.current = null
      addAction(action)
      emit('shape:add', { action })

    } else if ((tool === TOOLS.LINE || tool === TOOLS.ARROW) && shapeStart.current) {
      const { x: sx, y: sy } = shapeStart.current
      const action = {
        id: uuidv4(), type: tool,
        x1: sx, y1: sy, x2: pos.x, y2: pos.y,
        color, width, userId: userIdRef.current, ts: Date.now(),
      }
      shapeStart.current = null
      addAction(action)
      emit('shape:add', { action })
      
    } else if (tool === TOOLS.SELECT && dragState.current) {
      // The drag has ended, emit the final updated action to the network
      // (The action was continuously updated locally in WhiteboardCanvas pointerMove, 
      // but we wait till pointerUp to sync to everyone)
      const sel = stateRef.current.actions.find(a => a.id === stateRef.current.selectedId)
      if (sel) {
        socketRef?.current?.emit('action:update', { actionId: sel.id, patch: sel })
      }
      dragState.current = null
    }

  }, [userIdRef, emit, addAction])

  // Double-click: edit existing text or sticky note
  const handleDoubleClick = useCallback((e, canvas) => {
    const pos = getCanvasPos(e, canvas)
    const { actions, fontSize, color } = stateRef.current
    // Find topmost text or sticky at click position
    for (let i = actions.length - 1; i >= 0; i--) {
      const a = actions[i]
      if ((a.type === 'text' || a.type === 'sticky') && hitTestAction(a, pos.x, pos.y)) {
        if (a.type === 'text') {
          editTextAction(a, canvas)
        } else {
          editStickyAction(a, canvas)
        }
        return
      }
    }
    // No target hit — if TEXT tool active, place new text
    const { tool } = stateRef.current
    if (tool === TOOLS.TEXT) showTextInput(pos, color, fontSize, canvas)
    if (tool === TOOLS.STICKY) showStickyInput(pos, color, canvas)
  }, [])

  function editTextAction(existing, canvas) {
    if (textInput.current) textInput.current.remove()
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height

    const ta = document.createElement('textarea')
    ta.value = existing.text
    ta.style.cssText = `
      position: fixed;
      left: ${rect.left + existing.x * scaleX}px;
      top: ${rect.top + existing.y * scaleY}px;
      min-width: 160px; max-width: 400px;
      background: white; color: ${existing.color};
      font: 500 ${existing.fontSize}px Inter, sans-serif;
      border: 2px solid ${existing.color}; border-radius: 6px;
      padding: 6px 10px; resize: none; outline: none;
      z-index: 9999; line-height: 1.5;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `
    document.body.appendChild(ta)
    requestAnimationFrame(() => { ta.focus(); ta.select() })
    textInput.current = ta

    let done = false
    const finish = () => {
      if (done) return; done = true
      const text = ta.value.trim()
      if (text && text !== existing.text) {
        const updated = { ...existing, text, ts: Date.now() }
        updateAction(updated)
        socketRef?.current?.emit('text:edit', { actionId: existing.id, text })
      }
      ta.remove(); textInput.current = null
      document.removeEventListener('mousedown', onOutside)
    }
    const onOutside = (e) => { if (!ta.contains(e.target)) finish() }
    requestAnimationFrame(() => document.addEventListener('mousedown', onOutside))
    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') { ta.value = existing.text; finish() }
      if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) { e.preventDefault(); finish() }
    })
  }

  function editStickyAction(existing, canvas) {
    if (textInput.current) textInput.current.remove()
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height
    const w = STICKY_W * scaleX, h = STICKY_H * scaleY

    const ta = document.createElement('textarea')
    ta.value = existing.text || ''
    ta.style.cssText = `
      position: fixed;
      left: ${rect.left + existing.x * scaleX + 8}px;
      top: ${rect.top + existing.y * scaleY + 8}px;
      width: ${w - 16}px; height: ${h - 16}px;
      background: ${existing.bgColor || '#FEF08A'}; color: #1a1a2e;
      font: 500 14px Inter, sans-serif;
      border: none; border-radius: 4px;
      padding: 6px 8px; resize: none; outline: none;
      z-index: 9999; line-height: 1.5;
    `
    document.body.appendChild(ta)
    requestAnimationFrame(() => { ta.focus(); ta.select() })
    textInput.current = ta

    let done = false
    const finish = () => {
      if (done) return; done = true
      const text = ta.value.trim()
      const updated = { ...existing, text, ts: Date.now() }
      updateAction(updated)
      socketRef?.current?.emit('text:edit', { actionId: existing.id, text })
      ta.remove(); textInput.current = null
      document.removeEventListener('mousedown', onOutside)
    }
    const onOutside = (e) => { if (!ta.contains(e.target)) finish() }
    requestAnimationFrame(() => document.addEventListener('mousedown', onOutside))
    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') finish()
    })
  }

  function showTextInput(pos, color, fontSize, canvas) {
    if (textInput.current) textInput.current.remove()

    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height

    const ta = document.createElement('textarea')
    ta.style.cssText = `
      position: fixed;
      left: ${rect.left + pos.x * scaleX}px;
      top: ${rect.top + pos.y * scaleY}px;
      min-width: 160px;
      max-width: 400px;
      background: white;
      color: ${color};
      font: 500 ${fontSize}px Inter, sans-serif;
      border: 2px solid ${color};
      border-radius: 6px;
      padding: 6px 10px;
      resize: none;
      outline: none;
      z-index: 9999;
      line-height: 1.5;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `
    document.body.appendChild(ta)
    // Small delay before focus so the pointerdown doesn't blur immediately
    requestAnimationFrame(() => ta.focus())
    textInput.current = ta

    let done = false
    const finish = () => {
      if (done) return
      done = true
      const text = ta.value.trim()
      if (text) {
        const action = {
          id: uuidv4(), type: 'text',
          x: pos.x, y: pos.y, text, color, fontSize,
          userId: userIdRef.current, ts: Date.now(),
        }
        addAction(action)
        socketRef?.current?.emit('text:add', { action })
      }
      ta.remove()
      textInput.current = null
      document.removeEventListener('mousedown', onOutsideClick)
    }

    // Commit when user clicks outside the textarea
    const onOutsideClick = (e) => {
      if (!ta.contains(e.target)) finish()
    }
    // Attach after a frame so the originating click doesn't trigger it
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', onOutsideClick)
    })

    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') { ta.value = ''; finish() }
      // Ctrl+Enter or Shift+Enter to commit
      if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) { e.preventDefault(); finish() }
    })
  }

  // Sticky note input
  const STICKY_COLORS = ['#FEF08A', '#FCA5A5', '#86EFAC', '#93C5FD', '#C4B5FD', '#FDB347']
  function showStickyInput(pos, color, canvas) {
    if (textInput.current) textInput.current.remove()

    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height
    const w = STICKY_W * scaleX, h = STICKY_H * scaleY

    // Pick sticky color based on current tool color or cycle through palette
    const bgColor = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)]

    // Wrapper so the sticky outline is visible while typing
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      position: fixed;
      left: ${rect.left + pos.x * scaleX}px;
      top: ${rect.top + pos.y * scaleY}px;
      width: ${w}px; height: ${h}px;
      background: ${bgColor};
      border-radius: 4px;
      box-shadow: 2px 4px 12px rgba(0,0,0,0.18);
      z-index: 9999;
      display: flex; align-items: flex-start;
    `
    const ta = document.createElement('textarea')
    ta.placeholder = 'Type your note...'
    ta.style.cssText = `
      width: 100%; height: 100%;
      background: transparent; color: #1a1a2e;
      font: 500 14px Inter, sans-serif;
      border: 2px solid rgba(0,0,0,0.15); border-radius: 4px;
      padding: 10px 12px; resize: none; outline: none;
      line-height: 1.5;
    `
    wrapper.appendChild(ta)
    document.body.appendChild(wrapper)
    requestAnimationFrame(() => ta.focus())
    textInput.current = wrapper

    let done = false
    const finish = () => {
      if (done) return; done = true
      const text = ta.value.trim()
      if (text) {
        const action = {
          id: uuidv4(), type: 'sticky',
          x: pos.x, y: pos.y, text, bgColor,
          textColor: '#1a1a2e', fontSize: 14,
          userId: userIdRef.current, ts: Date.now(),
        }
        addAction(action)
        socketRef?.current?.emit('shape:add', { action })
      }
      wrapper.remove(); textInput.current = null
      document.removeEventListener('mousedown', onOutside)
    }
    const onOutside = (e) => { if (!wrapper.contains(e.target)) finish() }
    requestAnimationFrame(() => document.addEventListener('mousedown', onOutside))
    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') { ta.value = ''; finish() }
    })
  }

  return {
    state,
    stateRef,
    activeStroke,
    shapeStart,
    dragState,
    setTool,
    setColor,
    setWidth,
    setFontSize,
    addAction,
    updateAction,
    syncActions,
    undo,
    redo,
    clearBoard,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
  }
}
