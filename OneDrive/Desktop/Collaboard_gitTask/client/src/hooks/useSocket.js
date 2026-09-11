// useSocket.js — Socket.io client singleton + event bus

import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

let socketInstance = null

function getSocket() {
  if (!socketInstance) {
    socketInstance = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socketInstance
}

export function useSocket() {
  const socket = getSocket()

  const connect = useCallback(() => {
    if (!socket.connected) socket.connect()
  }, [socket])

  const disconnect = useCallback(() => {
    socket.disconnect()
    socketInstance = null
  }, [socket])

  const emit = useCallback((event, data) => {
    socket.emit(event, data)
  }, [socket])

  const on = useCallback((event, handler) => {
    socket.on(event, handler)
    return () => socket.off(event, handler)
  }, [socket])

  const off = useCallback((event, handler) => {
    socket.off(event, handler)
  }, [socket])

  return { socket, connect, disconnect, emit, on, off }
}

export default getSocket
