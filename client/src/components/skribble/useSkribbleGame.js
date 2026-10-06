// useSkribbleGame.js — Game state hook for Skribble mode

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * @param {React.MutableRefObject} socketRef  - ref to socket.io socket
 * @param {React.MutableRefObject} userIdRef  - ref to current socket ID
 * @returns Skribble game state and helpers
 */
export function useSkribbleGame(socketRef, userIdRef) {
  const [phase, setPhase]           = useState('waiting') // waiting|choosing|drawing|round_end|game_over
  const [drawerId, setDrawerId]     = useState(null)
  const [drawerName, setDrawerName] = useState('')
  const [maskedWord, setMaskedWord] = useState('')
  const [myWord, setMyWord]         = useState('')       // only for the drawer
  const [wordChoices, setWordChoices] = useState([])    // only for the drawer
  const [scores, setScores]         = useState({})
  const [turnOrder, setTurnOrder]   = useState([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [totalTurns, setTotalTurns] = useState(0)
  const [roundEndsAt, setRoundEndsAt] = useState(null)
  const [lastWord, setLastWord]     = useState('')      // revealed after round
  const [winnerIds, setWinnerIds]   = useState([])
  const [winnerNames, setWinnerNames] = useState([])
  const [choiceTimeoutMs, setChoiceTimeoutMs] = useState(10000)

  // Derived: is current user the drawer?
  const isDrawer = drawerId && drawerId === userIdRef?.current

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
        if (snapshot?.game) {
          const g = snapshot.game
          setPhase(g.phase || 'waiting')
          setDrawerId(g.drawerId || null)
          setMaskedWord(g.maskedWord || '')
          setScores(g.scores || {})
          setTurnOrder(g.turnOrder || [])
          setRoundEndsAt(g.roundEndsAt || null)
        }
      }

      // Game is about to start (players locked in, scores reset)
      const handleGameStarting = ({ turnOrder, totalRounds, scores }) => {
        setPhase('waiting')
        setTurnOrder(turnOrder || [])
        setTotalTurns((turnOrder?.length || 0) * (totalRounds || 1))
        setScores(scores || {})
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
      }

      // Round ended (timer or all guessed)
      const handleRoundEnd = ({ word, scores }) => {
        setPhase('round_end')
        setLastWord(word || '')
        setScores({ ...scores })
      }

      // Game over
      const handleGameOver = ({ winnerIds, winnerNames, scores }) => {
        setPhase('game_over')
        setWinnerIds(winnerIds || [])
        setWinnerNames(winnerNames || [])
        setScores({ ...scores })
      }

      socket.on('room:state', handleRoomState)
      socket.on('game:starting', handleGameStarting)
      socket.on('game:choosingStart', handleChoosingStart)
      socket.on('game:wordChoices', handleWordChoices)
      socket.on('game:yourWord', handleYourWord)
      socket.on('game:roundStart', handleRoundStart)
      socket.on('game:correctGuess', handleCorrectGuess)
      socket.on('game:roundEnd', handleRoundEnd)
      socket.on('game:over', handleGameOver)

      cleanup = () => {
        socket.off('room:state', handleRoomState)
        socket.off('game:starting', handleGameStarting)
        socket.off('game:choosingStart', handleChoosingStart)
        socket.off('game:wordChoices', handleWordChoices)
        socket.off('game:yourWord', handleYourWord)
        socket.off('game:roundStart', handleRoundStart)
        socket.off('game:correctGuess', handleCorrectGuess)
        socket.off('game:roundEnd', handleRoundEnd)
        socket.off('game:over', handleGameOver)
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

  const restartGame = useCallback(() => {
    emit('game:restart', {})
  }, [emit])

  return {
    phase,
    drawerId,
    drawerName,
    isDrawer,
    maskedWord,
    myWord,
    wordChoices,
    scores,
    turnOrder,
    roundNumber,
    totalTurns,
    roundEndsAt,
    lastWord,
    winnerIds,
    winnerNames,
    choiceTimeoutMs,
    chooseWord,
    restartGame,
  }
}

export default useSkribbleGame
