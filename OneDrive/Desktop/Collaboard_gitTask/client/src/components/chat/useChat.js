// useChat.js — Chat state and Socket.io communication hook

import { useState, useEffect, useRef, useCallback } from 'react'

export function useChat(socketRef, userIdRef) {
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState([]) // array of userIds

  const isTypingRef = useRef(false)
  const typingTimerRef = useRef(null)
  const remoteTypingTimersRef = useRef(new Map()) // userId -> timeoutId

  // ── Load history from room:state, listen to chat:message and chat:typing ──
  useEffect(() => {
    let cleanup = null

    const attach = () => {
      const socket = socketRef?.current
      if (!socket) return false

      const handleRoomState = (snapshot) => {
        if (snapshot && Array.isArray(snapshot.messages)) {
          setMessages(snapshot.messages)
        }
      }

      const handleChatMessage = (msg) => {
        if (!msg) return
        setMessages((prev) => [...prev, msg])
      }

      const handleChatTyping = ({ userId, isTyping }) => {
        const myId = userIdRef?.current ?? userIdRef
        if (!userId || userId === myId) return

        if (isTyping) {
          // Clear any existing timeout for this user
          if (remoteTypingTimersRef.current.has(userId)) {
            clearTimeout(remoteTypingTimersRef.current.get(userId))
          }
          // 4s safety net auto-clear
          const timer = setTimeout(() => {
            remoteTypingTimersRef.current.delete(userId)
            setTypingUsers((prev) => prev.filter((id) => id !== userId))
          }, 4000)
          remoteTypingTimersRef.current.set(userId, timer)

          setTypingUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
        } else {
          if (remoteTypingTimersRef.current.has(userId)) {
            clearTimeout(remoteTypingTimersRef.current.get(userId))
            remoteTypingTimersRef.current.delete(userId)
          }
          setTypingUsers((prev) => prev.filter((id) => id !== userId))
        }
      }

      const handleUserLeft = ({ userId }) => {
        if (remoteTypingTimersRef.current.has(userId)) {
          clearTimeout(remoteTypingTimersRef.current.get(userId))
          remoteTypingTimersRef.current.delete(userId)
        }
        setTypingUsers((prev) => prev.filter((id) => id !== userId))
      }

      socket.on('room:state', handleRoomState)
      socket.on('chat:message', handleChatMessage)
      socket.on('chat:typing', handleChatTyping)
      socket.on('room:user_left', handleUserLeft)

      cleanup = () => {
        socket.off('room:state', handleRoomState)
        socket.off('chat:message', handleChatMessage)
        socket.off('chat:typing', handleChatTyping)
        socket.off('room:user_left', handleUserLeft)
      }
      return true
    }

    if (!attach()) {
      const interval = setInterval(() => {
        if (attach()) {
          clearInterval(interval)
        }
      }, 50)
      return () => {
        clearInterval(interval)
        if (cleanup) cleanup()
      }
    }

    return () => {
      if (cleanup) cleanup()
    }
  }, [socketRef, userIdRef])

  // Cleanup all timers on unmount
  useEffect(() => {
    const remoteTimers = remoteTypingTimersRef.current
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      remoteTimers.forEach((timer) => clearTimeout(timer))
      remoteTimers.clear()
    }
  }, [])

  // ── Typing debounce logic ──────────────────────────────────────────────────
  const setTyping = useCallback(
    (isTyping) => {
      const socket = socketRef?.current
      if (!socket) return

      if (isTyping) {
        if (!isTypingRef.current) {
          isTypingRef.current = true
          socket.emit('chat:typing', { isTyping: true })
        }
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
        }
        typingTimerRef.current = setTimeout(() => {
          isTypingRef.current = false
          socket.emit('chat:typing', { isTyping: false })
          typingTimerRef.current = null
        }, 2000)
      } else {
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
          typingTimerRef.current = null
        }
        if (isTypingRef.current) {
          isTypingRef.current = false
          socket.emit('chat:typing', { isTyping: false })
        }
      }
    },
    [socketRef]
  )

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (text) => {
      if (typeof text !== 'string') return
      const trimmed = text.trim()
      if (!trimmed) return

      const socket = socketRef?.current
      if (!socket) return

      // Emit isTyping: false immediately when a message is sent
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      if (isTypingRef.current) {
        isTypingRef.current = false
        socket.emit('chat:typing', { isTyping: false })
      }

      socket.emit('chat:message', { text: trimmed })
    },
    [socketRef]
  )

  return {
    messages,
    typingUsers,
    sendMessage,
    setTyping,
  }
}

export default useChat
