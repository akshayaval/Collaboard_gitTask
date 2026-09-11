// usePixelArt.js — Pixel art cell state + fill logic hook

import { useReducer, useCallback } from 'react'
import { getTemplate } from '../../lib/pixelTemplates'

const initialState = {
  templateId: 'mandala',
  template: getTemplate('mandala'),
  cellStates: new Map(), // cellId -> { color }
  selectedColor: null,   // null = use palette
  guidedMode: true,      // true = validate against palette number
  paletteSelection: 1,   // which palette number is selected
  freeColor: '#60A5FA',  // color for free mode
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TEMPLATE': {
      const template = getTemplate(action.payload)
      return {
        ...state,
        templateId: action.payload,
        template,
        cellStates: new Map(),
        paletteSelection: 1,
      }
    }
    case 'FILL_CELL': {
      const next = new Map(state.cellStates)
      next.set(String(action.cellId), { color: action.color })
      return { ...state, cellStates: next }
    }
    case 'SYNC_CELLS': {
      const next = new Map()
      for (const [k, v] of Object.entries(action.payload || {})) {
        next.set(k, v)
      }
      return { ...state, cellStates: next }
    }
    case 'SET_GUIDED':  return { ...state, guidedMode: action.payload }
    case 'SET_PALETTE_SEL': return { ...state, paletteSelection: action.payload }
    case 'SET_FREE_COLOR': return { ...state, freeColor: action.payload }
    case 'SYNC_TEMPLATE': return { ...state, templateId: action.payload, template: getTemplate(action.payload) }
    default: return state
  }
}

export function usePixelArt(socketRef) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fillCell = useCallback((cellId, color) => {
    dispatch({ type: 'FILL_CELL', cellId, color })
    socketRef?.current?.emit('pixel:fill', { cellId, color })
  }, [socketRef])

  const handleCellClick = useCallback((cell) => {
    const { guidedMode, template, freeColor } = state
    let targetColor

    if (guidedMode) {
      const paletteEntry = template.palette.find(p => p.number === cell.number)
      if (!paletteEntry) return
      targetColor = paletteEntry.color
    } else {
      targetColor = freeColor
    }

    fillCell(cell.id, targetColor)
  }, [state, fillCell])

  const syncCells = useCallback((cellStates) => {
    dispatch({ type: 'SYNC_CELLS', payload: cellStates })
  }, [])

  const setTemplate = useCallback((id) => {
    dispatch({ type: 'SET_TEMPLATE', payload: id })
    socketRef?.current?.emit('pixel:template', { templateId: id })
  }, [socketRef])

  const syncTemplate = useCallback((id) => {
    dispatch({ type: 'SYNC_TEMPLATE', payload: id })
  }, [])

  const setGuidedMode = useCallback((v) => dispatch({ type: 'SET_GUIDED', payload: v }), [])
  const setPaletteSelection = useCallback((n) => dispatch({ type: 'SET_PALETTE_SEL', payload: n }), [])
  const setFreeColor = useCallback((c) => dispatch({ type: 'SET_FREE_COLOR', payload: c }), [])

  return {
    state,
    handleCellClick,
    fillCell,
    syncCells,
    setTemplate,
    syncTemplate,
    setGuidedMode,
    setPaletteSelection,
    setFreeColor,
  }
}
