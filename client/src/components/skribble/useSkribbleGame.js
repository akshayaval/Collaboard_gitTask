// useSkribbleGame.js — Game state hook for Skribble mode

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * @param {React.MutableRefObject} socketRef  - ref to socket.io socket
 * @param {React.MutableRefObject} userIdRef  - ref to current socket ID
 * @returns Skribble game state and helpers
 */
export function useSkribbleGame(socketRef, userIdRef) {
  const [phase, setPhase]           = useState('lobby') // lobby|waiting|choosing|drawing|round_end|game_over
  const [hostId, setHostId]         = useState(null)
  const [drawerId, setDrawerId]     = useState(null)
  const [drawerName, setDrawerName] = useState('')
  const [maskedWord, setMaskedWord] = useState('')
  const [myWord, setMyWord]         = useState('')       // only for the drawer
  const [wordChoices, setWordChoices] = useState([])    // only for the drawer
  const [scores, setScores]         = useState({})
  const [roundScores, setRoundScores] = useState({})
  const [turnOrder, setTurnOrder]   = useState([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [totalTurns, setTotalTurns] = useState(0)
  const [roundEndsAt, setRoundEndsAt] = useState(null)
  const [lastWord, setLastWord]     = useState('')      // revealed after round
  const [roundEndReason, setRoundEndReason] = useState(null) // 'timeUp' | 'allGuessed' | 'drawerLeft'
  const [winnerIds, setWinnerIds]   = useState([])
  const [winnerNames, setWinnerNames] = useState([])
  const [choiceTimeoutMs, setChoiceTimeoutMs] = useState(10000)

  // Derived
  const isDrawer = drawerId && drawerId === userIdRef?.current
  const isHost = Boolean(hostId && hostId === userIdRef?.current)

  // ── Emit helper ─────────────────────────────────────────────────────────────
  const emit = useCallback((event, data) => {
    socketRef?.current?.emit(event, data)
  }, [socketRef])

  // ── Socket listener setup ──────────────────────────────────────────────────
  useEffect(() => {
    let cleanup = null

    const attach = () => {
      const socket = socketRef?.current
      if (!socket) return false

      // Restore from room:state if we join mid-game
      const handleRoomState = (snapshot) => {
        if (snapshot?.hostId) setHostId(snapshot.hostId)
        if (snapshot?.game) {
          const g = snapshot.game
          setPhase(g.phase || 'lobby')
          setDrawerId(g.drawerId || null)
          setMaskedWord(g.maskedWord || '')
          setScores(g.scores || {})
          setRoundScores(g.roundScores || {})
          setTurnOrder(g.turnOrder || [])
          setRoundEndsAt(g.roundEndsAt || null)
          setRoundNumber(g.round ? g.round + 1 : 1) // round is 0-indexed turn count
          if (g.turnOrder && g.totalRounds) {
            setTotalTurns(g.turnOrder.length * g.totalRounds)
          }
          if (g.lastWord) setLastWord(g.lastWord)
          if (g.lastReason) setRoundEndReason(g.lastReason)
          if (g.winnerIds) setWinnerIds(g.winnerIds)
        }
      }

      const handleHost = ({ hostId }) => {
        setHostId(hostId)
      }

      // Game is about to start (players locked in, scores reset)
      const handleGameStarting = ({ turnOrder, totalRounds, scores }) => {
        setPhase('waiting')
        setTurnOrder(turnOrder || [])
        setTotalTurns((turnOrder?.length || 0) * (totalRounds || 1))
        setScores(scores || {})
        setRoundScores({})
        setDrawerId(null)
        setMaskedWord('')
        setMyWord('')
        setWordChoices([])
        setWinnerIds([])
        setWinnerNames([])
      }

      // Drawer is choosing — tell everyone who's up
      const handleChoosingStart = ({ drawerId, drawerName, round, totalTurns, timeoutMs }) => {
        setPhase('choosing')
        setDrawerId(drawerId)
        setDrawerName(drawerName || '')
        setRoundNumber(round || 1)
        setTotalTurns(totalTurns || 0)
        setMaskedWord('')
        setMyWord('')
        setLastWord('')
        setRoundEndReason(null)
        setRoundScores({})
        setChoiceTimeoutMs(timeoutMs || 10000)
      }

      // Only the drawer receives this
      const handleWordChoices = ({ words, timeoutMs }) => {
        setWordChoices(words || [])
        setChoiceTimeoutMs(timeoutMs || 10000)
      }

      // Drawer knows their confirmed word (private)
      const handleYourWord = ({ word, roundEndsAt }) => {
        setMyWord(word || '')
        setRoundEndsAt(roundEndsAt || null)
        setPhase('drawing')
      }

      // Everyone gets this when drawing starts
      const handleRoundStart = ({ drawerId, drawerName, maskedWord, roundEndsAt, round, totalTurns }) => {
        setPhase('drawing')
        setDrawerId(drawerId)
        setDrawerName(drawerName || '')
        setMaskedWord(maskedWord || '')
        setRoundEndsAt(roundEndsAt || null)
        setRoundNumber(round || 1)
        setTotalTurns(totalTurns || 0)
        setWordChoices([])
      }

      // A player guessed correctly — update scores live
      const handleCorrectGuess = ({ userId, name, points, scores }) => {
        setScores({ ...scores })
        setRoundScores(prev => ({ ...prev, [userId]: points }))
      }

      // Round ended (timer or all guessed)
      const handleRoundEnd = ({ word, reason, scores, roundScores }) => {
        setPhase('round_end')
        setLastWord(word || '')
        setRoundEndReason(reason || 'timeUp')
        setScores({ ...scores })
        if (roundScores) setRoundScores({ ...roundScores })
      }

      // Game over
      const handleGameOver = ({ winnerIds, winnerNames, scores }) => {
        setPhase('game_over')
        setWinnerIds(winnerIds || [])
        setWinnerNames(winnerNames || [])
        setScores({ ...scores })
      }

      // Return to lobby
      const handleLobby = ({ phase: newPhase, hostId: newHostId, scores }) => {
        setPhase(newPhase || 'lobby')
        setScores(scores || {})
        setRoundScores({})
        setLastWord('')
        setRoundEndReason(null)
        setDrawerId(null)
        setMaskedWord('')
        setMyWord('')
        setWordChoices([])
        setWinnerIds([])
        setWinnerNames([])
        setTurnOrder([])
        setRoundNumber(1)
        if (newHostId) setHostId(newHostId)
      }

      socket.on('room:state', handleRoomState)
      socket.on('room:host', handleHost)
      socket.on('game:starting', handleGameStarting)
      socket.on('game:choosingStart', handleChoosingStart)
      socket.on('game:wordChoices', handleWordChoices)
      socket.on('game:yourWord', handleYourWord)
      socket.on('game:roundStart', handleRoundStart)
      socket.on('game:correctGuess', handleCorrectGuess)
      socket.on('game:roundEnd', handleRoundEnd)
      socket.on('game:over', handleGameOver)
      socket.on('game:lobby', handleLobby)

      cleanup = () => {
        socket.off('room:state', handleRoomState)
        socket.off('room:host', handleHost)
        socket.off('game:starting', handleGameStarting)
        socket.off('game:choosingStart', handleChoosingStart)
        socket.off('game:wordChoices', handleWordChoices)
        socket.off('game:yourWord', handleYourWord)
        socket.off('game:roundStart', handleRoundStart)
        socket.off('game:correctGuess', handleCorrectGuess)
        socket.off('game:roundEnd', handleRoundEnd)
        socket.off('game:over', handleGameOver)
        socket.off('game:lobby', handleLobby)
      }
      return true
    }

    if (!attach()) {
      const interval = setInterval(() => {
        if (attach()) clearInterval(interval)
      }, 50)
      return () => {
        clearInterval(interval)
        if (cleanup) cleanup()
      }
    }

    return () => { if (cleanup) cleanup() }
  }, [socketRef])

  // ── Actions ────────────────────────────────────────────────────────────────
  const chooseWord = useCallback((word) => {
    emit('game:chooseWord', { word })
    setMyWord(word)
    setPhase('drawing')
    setWordChoices([])
  }, [emit])

  const startGame = useCallback(() => {
    emit('game:start', {})
  }, [emit])

  const restartGame = useCallback(() => {
    emit('game:restart', {})
  }, [emit])

  return {
    phase,
    hostId,
    isHost,
    drawerId,
    drawerName,
    isDrawer,
    maskedWord,
    myWord,
    wordChoices,
    scores,
    roundScores,
    turnOrder,
    roundNumber,
    totalTurns,
    roundEndsAt,
    lastWord,
    roundEndReason,
    winnerIds,
    winnerNames,
    choiceTimeoutMs,
    chooseWord,
    startGame,
    restartGame,
  }
}

export default useSkribbleGame
