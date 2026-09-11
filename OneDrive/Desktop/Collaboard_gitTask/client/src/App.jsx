import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Room from './pages/Room.jsx'
import ToastProvider from './components/ui/ToastProvider.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
