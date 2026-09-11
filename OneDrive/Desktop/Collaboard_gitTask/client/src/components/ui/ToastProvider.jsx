// ToastProvider.jsx — Global toast notification system

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)

export function useToast() {
  return useContext(ToastCtx)
}

let toastId = 0

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast animate-slideInRight">
            <div className={`toast-dot toast-dot-${toast.type}`} />
            <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
