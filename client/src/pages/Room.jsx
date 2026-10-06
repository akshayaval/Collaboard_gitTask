// Room.jsx — Main room shell: branches on gameMode (freeform | skribble)

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'

import { useWhiteboard }  from '../components/whiteboard/useWhiteboard'
import { useChat }        from '../components/chat/useChat'
import { useSkribbleGame } from '../components/skribble/useSkribbleGame'
import { useToast }       from '../components/ui/ToastProvider'

import WhiteboardCanvas  from '../components/whiteboard/WhiteboardCanvas'
import Toolbar           from '../components/whiteboard/Toolbar'
import PresenceSidebar   from '../components/presence/PresenceSidebar'
import ExportModal       from '../components/ui/ExportModal'

import GameBanner        from '../components/skribble/GameBanner'
import WordChoiceModal   from '../components/skribble/WordChoiceModal'
import Scoreboard        from '../components/skribble/Scoreboard'
import WinnerModal       from '../components/skribble/WinnerModal'

import styles        from './Room.module.css'
import skribStyles   from '../components/skribble/Skribble.module.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined

export default function Room() {
  const { roomId }   = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const toast        = useToast()

  // Load user session
  const session = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('collaboard_user') || '{}') }
    catch { return {} }
  }, [])

  const userName  = session.name  || 'Anonymous'
  const userColor = session.color || '#60A5FA'

  // Mode is determined from router state (creator) or from server's room:state (joiner)
  const [gameMode, setGameMode]     = useState(location.state?.gameMode || 'freeform')
  const [totalRounds, setTotalRounds] = useState(location.state?.totalRounds || 3)

  // -- Socket ----------------------------------------------------------------
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const userId = useRef(null)

  // -- Shared room state -----------------------------------------------------
  const [users, setUsers]         = useState([])
  const [showExport, setShowExport] = useState(false)

  // -- Cursors ---------------------------------------------------------------
  const [cursors, setCursors] = useState(new Map())

  // -- Canvas refs for export ------------------------------------------------
  const wbCanvasRefs = useRef(null)

  // -- Whiteboard hook -------------------------------------------------------
  const wb = useWhiteboard(socketRef, userId, wbCanvasRefs)

  // -- Chat hook -------------------------------------------------------------
  const chat = useChat(socketRef, userId)

  // -- Skribble hook ---------------------------------------------------------
  const skribble = useSkribbleGame(socketRef, userId)

  // Derived: is the current user the drawer in skribble?
  const isDrawer = gameMode === 'skribble' && skribble.drawerId === userId.current
  const drawingDisabled = gameMode === 'skribble' && !isDrawer

  // -- Socket setup + room join ----------------------------------------------
  useEffect(() => {
    if (!session.name) {
      navigate('/')
      return
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      userId.current = socket.id

      socket.emit('room:join', {
        roomId,
        name: userName,
        color: userColor,
        gameMode: location.state?.gameMode || undefined,
        totalRounds: location.state?.totalRounds || undefined,
      })
    })

    socket.on('disconnect', () => setConnected(false))

    // Full room state on join — picks up gameMode from server
    socket.on('room:state', (snapshot) => {
      setUsers(snapshot.users)
      wb.syncActions(snapshot.whiteboard.actions)
      if (snapshot.gameMode) setGameMode(snapshot.gameMode)
      if (snapshot.totalRounds) setTotalRounds(snapshot.totalRounds)
    })

    // User list updates
    socket.on('room:users', (usersList) => setUsers(usersList))

    socket.on('room:user_joined', (user) => {
      toast(`${user.name} joined the room`, 'join')
    })

    socket.on('room:user_left', ({ userId: leftId }) => {
      const user = users.find(u => u.id === leftId)
      if (user) toast(`${user.name} left the room`, 'leave')
    })

    // Whiteboard events
    socket.on('draw:start', ({ actionId, point, color, width, tool, userId: uid }) => {
      wb.addAction({
        id: actionId, type: tool === 'eraser' ? 'erase' : 'stroke',
        points: [point], color, width, userId: uid, ts: Date.now(),
        _streaming: true,
      })
    })

    socket.on('draw:move', ({ actionId, point }) => {
      wb.syncActions((prev) => {
        const actions = [...prev]
        const idx = actions.findIndex(a => a.id === actionId)
        if (idx !== -1) {
          actions[idx] = { ...actions[idx], points: [...actions[idx].points, point] }
        }
        return actions
      })
    })

    socket.on('draw:end', () => { /* streaming action already in log */ })
    socket.on('shape:add', ({ action }) => wb.addAction(action))
    socket.on('text:add',  ({ action }) => wb.addAction(action))
    socket.on('text:edit', ({ actionId, text }) => {
      const existing = wb.stateRef.current.actions.find(a => a.id === actionId)
      if (existing) wb.updateAction({ ...existing, text })
    })
    socket.on('action:update', ({ actionId, patch }) => {
      const existing = wb.stateRef.current.actions.find(a => a.id === actionId)
      if (existing) wb.updateAction({ ...existing, ...patch })
    })
    socket.on('whiteboard:sync', (actions) => wb.syncActions(actions))

    // Cursors
    socket.on('cursor:move', ({ userId: uid, x, y }) => {
      setCursors(prev => {
        const next = new Map(prev)
        const user = users.find(u => u.id === uid)
        next.set(uid, { x, y, name: user?.name || '?', color: user?.color || '#60A5FA' })
        return next
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId]) // eslint-disable-line

  // -- Keyboard shortcuts ----------------------------------------------------
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        wb.undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        wb.redo()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [wb])

  // -- Export canvases -------------------------------------------------------
  const getExportCanvases = useCallback(() => {
    if (wbCanvasRefs.current) {
      const { grid, content } = wbCanvasRefs.current
      return [grid, content].filter(Boolean)
    }
    return []
  }, [])

  // -- Handlers --------------------------------------------------------------
  const handleLeave = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    toast('Room link copied!', 'join')
  }, [toast])

  // ── Shared header (used by both modes) ─────────────────────────────────────
  const header = (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, overflow: 'hidden',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 4,
            background: 'var(--surface-3)', flexShrink: 0,
          }}>
            <div style={{ background: '#4ADE80', borderRadius: 2 }} />
            <div style={{ background: '#60A5FA', borderRadius: 2 }} />
            <div style={{ background: '#F472B6', borderRadius: 2 }} />
            <div style={{ background: '#FBBF24', borderRadius: 2 }} />
          </div>
          <span className={styles.logoText}>Collaboard</span>
        </div>
        <div className={styles.headerDivider} />
        {/* Room code pill — shared by both modes */}
        <div
          className={styles.roomPill}
          title="Click to copy room code"
          id="room-code-pill"
          onClick={() => navigator.clipboard.writeText(roomId).catch(() => {})}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: 5,
            background: gameMode === 'skribble' ? '#7C3AED' : '#3B82F6', flexShrink: 0,
          }}>
            <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{roomId}</span>
          {gameMode === 'skribble' && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700,
              background: 'rgba(139,92,246,0.12)',
              color: '#7C3AED',
              padding: '1px 6px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}>SKRIBBLE</span>
          )}
        </div>
        {/* Live badge */}
        <div className={styles.liveBadge}>
          <div className={styles.liveDot} />
          LIVE
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Participant count */}
        <div className={styles.headerChip} title="Participants">
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6, background: '#F59E0B', flexShrink: 0, position: 'relative',
          }}>
            <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            {users.length > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: '#EF4444', color: 'white', borderRadius: '50%',
                width: 14, height: 14, fontSize: '0.55rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--surface)',
              }}>
                {users.length}
              </span>
            )}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{users.length}</span>
        </div>

        {/* Connection status */}
        <div className={styles.headerChip} title="Connection status">
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6,
            background: connected ? '#0D9488' : '#64748B', flexShrink: 0,
          }}>
            <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </span>
          <span style={{ fontSize: '0.75rem', color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>

        {/* Export (only in freeform mode) */}
        {gameMode === 'freeform' && (
          <button
            className={styles.headerBtn}
            onClick={() => setShowExport(true)}
            title="Export"
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8, background: '#16A34A',
            }}>
              <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </span>
            <span style={{ fontSize: '0.8rem' }}>Export</span>
          </button>
        )}
      </div>
    </header>
  )

  // ── FREEFORM MODE ──────────────────────────────────────────────────────────
  if (gameMode === 'freeform') {
    return (
      <div className={styles.shell}>
        {header}
        <div className={styles.content}>
          <Toolbar
            wb={wb}
            onExport={() => setShowExport(true)}
            onShare={handleShare}
          />
          <WhiteboardCanvas
            wb={wb}
            userId={userId.current}
            cursors={cursors}
            canvasRefs={wbCanvasRefs}
          />
          <PresenceSidebar
            users={users}
            currentUserId={userId.current}
            roomId={roomId}
            chat={chat}
          />
        </div>
        {showExport && (
          <ExportModal
            canvases={getExportCanvases()}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    )
  }

  // ── SKRIBBLE MODE ──────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>
      {header}

      {/* Game banner (masked word + timer) */}
      <GameBanner
        phase={skribble.phase}
        isDrawer={isDrawer}
        drawerName={skribble.drawerName}
        maskedWord={skribble.maskedWord}
        myWord={skribble.myWord}
        roundEndsAt={skribble.roundEndsAt}
        roundNumber={skribble.roundNumber}
        totalTurns={skribble.totalTurns}
      />

      <div className={styles.content}>
        {/* Toolbar shown only to the drawer */}
        {isDrawer && (
          <Toolbar
            wb={wb}
            onExport={() => {}}
            onShare={handleShare}
          />
        )}

        <WhiteboardCanvas
          wb={wb}
          userId={userId.current}
          cursors={cursors}
          canvasRefs={wbCanvasRefs}
          drawingDisabled={drawingDisabled}
        />

        {/* Right panel: scoreboard + chat */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 280, flexShrink: 0, borderLeft: '1px solid rgba(0,0,0,0.07)' }}>
          <Scoreboard
            scores={skribble.scores}
            users={users}
            currentUserId={userId.current}
            drawerId={skribble.drawerId}
          />
          <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <PresenceSidebar
              users={users}
              currentUserId={userId.current}
              roomId={roomId}
              chat={chat}
              hideSidebar={true}
            />
          </div>
        </div>
      </div>

      {/* Word choice modal (drawer only, during choosing phase) */}
      {skribble.phase === 'choosing' && isDrawer && skribble.wordChoices.length > 0 && (
        <WordChoiceModal
          words={skribble.wordChoices}
          timeoutMs={skribble.choiceTimeoutMs}
          onChoose={skribble.chooseWord}
        />
      )}

      {/* Winner modal (game over) */}
      {skribble.phase === 'game_over' && (
        <WinnerModal
          winnerIds={skribble.winnerIds}
          winnerNames={skribble.winnerNames}
          scores={skribble.scores}
          users={users}
          currentUserId={userId.current}
          onLeave={handleLeave}
          onRestart={skribble.restartGame}
        />
      )}
    </div>
  )
}
