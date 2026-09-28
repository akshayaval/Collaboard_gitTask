// PresenceSidebar.jsx — Room info, participant list with typing indicator, and text chat panel

import React, { useCallback } from 'react'
import ChatPanel from '../chat/ChatPanel'
import styles from './PresenceSidebar.module.css'

export default function PresenceSidebar({
  users = [],
  currentUserId,
  roomId,
  chat,
}) {
  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomId).catch(() => {})
  }, [roomId])

  return (
    <div className={styles.sidebar}>
      {/* ── Room code ── */}
      <div className={styles.roomCode}>
        <span className="label-xs">Room</span>
        <button className={styles.codeBtn} onClick={copyRoomCode} title="Click to copy">
          <span className={`mono ${styles.code}`}>{roomId}</span>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
      </div>

      <div className={styles.divider} />

      {/* ── Participants List ── */}
      <div className={styles.usersSection}>
        <span className="label-xs" style={{ marginBottom: 8, display: 'block' }}>
          Participants ({users.length})
        </span>
        <div className={styles.userList}>
          {users.map((user) => {
            const isMe = user.id === currentUserId
            const isTyping = !isMe && chat?.typingUsers?.includes(user.id)

            return (
              <div key={user.id} className={styles.userRow}>
                <div className={styles.avatar} style={{ background: user.color }}>
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.name} {isMe && <span className={styles.meBadge}>you</span>}
                  </span>
                  {/* Animated dots badge next to participant name while typing */}
                  {isTyping && (
                    <span className={styles.typingBadge} title="Typing…">
                      <span className={styles.typingBadgeDot} style={{ animationDelay: '0s' }} />
                      <span className={styles.typingBadgeDot} style={{ animationDelay: '0.2s' }} />
                      <span className={styles.typingBadgeDot} style={{ animationDelay: '0.4s' }} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Chat Panel (replaces voice controls) ── */}
      <div className={styles.chatSection}>
        <div className={styles.chatHeader}>
          <span className="label-xs">Chat</span>
        </div>
        <ChatPanel
          messages={chat?.messages}
          typingUsers={chat?.typingUsers}
          sendMessage={chat?.sendMessage}
          setTyping={chat?.setTyping}
          currentUserId={currentUserId}
          users={users}
        />
      </div>
    </div>
  )
}
