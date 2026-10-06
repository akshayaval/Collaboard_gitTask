// ChatPanel.jsx — Real-time text chat panel with typing indicator

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import styles from './ChatPanel.module.css'

export default function ChatPanel({
  messages = [],
  typingUsers = [],
  sendMessage,
  setTyping,
  currentUserId,
  users = [],
}) {
  const [inputText, setInputText] = useState('')
  const messagesContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const userScrolledUpRef = useRef(false)

  // Map typing user IDs to user objects
  const activeTypingUsers = useMemo(() => {
    return typingUsers
      .filter((uid) => uid !== currentUserId)
      .map((uid) => {
        const found = users.find((u) => u.id === uid)
        return found || { id: uid, name: 'Guest', color: '#60A5FA' }
      })
  }, [typingUsers, currentUserId, users])

  // Format timestamp (e.g. 10:24 AM)
  const formatTime = useCallback((ts) => {
    if (!ts) return ''
    try {
      const date = new Date(ts)
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }, [])

  // Detect user scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 60
  }, [])

  // Auto-scroll to latest message if not scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTypingUsers.length])

  // Handle typing change in textarea
  const handleChange = (e) => {
    const val = e.target.value
    setInputText(val)
    if (val.trim().length > 0) {
      setTyping?.(true)
    } else {
      setTyping?.(false)
    }
  }

  // Handle message sending
  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    sendMessage?.(trimmed)
    setInputText('')
    userScrolledUpRef.current = false
  }

  // Key down for Enter vs Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.chatContainer}>
      {/* ── Scrollable Message List ── */}
      <div
        className={styles.messagesList}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            // ── System message (game notices, correct-guess confirmations) ──
            if (msg.userId === '__system__') {
              return (
                <div
                  key={msg.id || `${msg.ts}-system`}
                  className={`${styles.systemMsg} ${msg.correct ? styles.systemMsgCorrect : styles.systemMsgGame}`}
                >
                  {msg.text}
                </div>
              )
            }

            const isMe = msg.userId === currentUserId
            const initial = (msg.name?.[0] || '?').toUpperCase()

            return (
              <div
                key={msg.id || `${msg.ts}-${msg.userId}`}
                className={`${styles.messageRow} ${isMe ? styles.messageRowSelf : ''}`}
              >
                {/* Sender Avatar */}
                <div
                  className={styles.avatar}
                  style={{ background: msg.color || '#60A5FA' }}
                  title={msg.name}
                >
                  {initial}
                </div>

                <div
                  className={`${styles.messageContentWrapper} ${
                    isMe ? styles.messageContentWrapperSelf : ''
                  }`}
                >
                  <div className={styles.messageHeader}>
                    <span
                      className={`${styles.senderName} ${
                        isMe ? styles.senderNameSelf : ''
                      }`}
                    >
                      {isMe ? 'You' : msg.name}
                    </span>
                    <span className={styles.timestamp}>{formatTime(msg.ts)}</span>
                  </div>

                  <div
                    className={`${styles.bubble} ${
                      isMe ? styles.bubbleSelf : styles.bubbleOther
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Typing Indicator ── */}
      {activeTypingUsers.length > 0 && (
        <div className={styles.typingIndicatorContainer}>
          {activeTypingUsers.length > 3 ? (
            <>
              <div className={styles.typingAvatars}>
                {activeTypingUsers.slice(0, 3).map((u) => (
                  <div
                    key={u.id}
                    className={styles.typingAvatar}
                    style={{ background: u.color }}
                    title={u.name}
                  >
                    {(u.name?.[0] || '?').toUpperCase()}
                  </div>
                ))}
              </div>
              <span className={styles.typingText}>3+ people are typing</span>
            </>
          ) : (
            <div className={styles.typingAvatars}>
              {activeTypingUsers.map((u) => (
                <div
                  key={u.id}
                  className={styles.typingAvatar}
                  style={{ background: u.color }}
                  title={u.name}
                >
                  {(u.name?.[0] || '?').toUpperCase()}
                </div>
              ))}
            </div>
          )}

          <div className={styles.typingBubble}>
            <span className={styles.typingDot} style={{ animationDelay: '0s' }} />
            <span className={styles.typingDot} style={{ animationDelay: '0.2s' }} />
            <span className={styles.typingDot} style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      )}

      {/* ── Input Box & Send Button ── */}
      <form
        className={styles.inputForm}
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <div className={styles.inputRow}>
          <textarea
            className={styles.textarea}
            rows={1}
            placeholder="Type a message…"
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!inputText.trim()}
            title="Send (Enter)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
