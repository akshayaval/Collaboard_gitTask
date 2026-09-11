// CursorOverlay.jsx — SVG overlay for live remote cursors

import React, { useEffect, useState } from 'react'

export default function CursorOverlay({ cursors, containerRef, canvasRef }) {
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef?.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDimensions({ w: el.offsetWidth, h: el.offsetHeight })
    })
    ro.observe(el)
    setDimensions({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [containerRef])

  if (!cursors || cursors.size === 0) return null

  // Scale canvas coords to screen coords
  const canvas = canvasRef?.current
  const scaleX = canvas ? dimensions.w / canvas.width : 1
  const scaleY = canvas ? dimensions.h / canvas.height : 1

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'visible',
      }}
    >
      {Array.from(cursors.entries()).map(([uid, cursor]) => {
        if (!cursor) return null
        const sx = cursor.x * scaleX
        const sy = cursor.y * scaleY
        return (
          <g key={uid} transform={`translate(${sx}, ${sy})`}>
            {/* Cursor arrow */}
            <path
              d="M0,0 L0,18 L5,14 L8,20 L11,19 L8,13 L14,13 Z"
              fill={cursor.color}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Name label */}
            <rect
              x="14"
              y="14"
              width={cursor.name.length * 7.5 + 10}
              height="20"
              rx="4"
              fill={cursor.color}
              opacity="0.9"
            />
            <text
              x="19"
              y="28"
              fill="white"
              fontSize="11"
              fontFamily="Inter, sans-serif"
              fontWeight="600"
            >
              {cursor.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
