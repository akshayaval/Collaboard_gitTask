// PresenceSidebar.jsx — User list with avatars, speaking rings, and mic control

import React, { useState, useCallback } from 'react'
import styles from './PresenceSidebar.module.css'

export default function PresenceSidebar({
  users,
  currentUserId,
  speaking,       // Map<userId, boolean>
  voice,          // useVoiceChat hook
  roomId,
}) {
  const [muted, setMuted] = useState(false)
  const [voiceJoined, setVoiceJoined] = useState(false)

  const handleJoinVoice = useCallback(async () => {
    if (!voiceJoined) {
      await voice.joinCall()
      setVoiceJoined(true)
    }
  }, [voice, voiceJoined])

  const handleToggleMute = useCallback(() => {
    const nowMuted = voice.toggleMute()
    setMuted(nowMuted)
  }, [voice])

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomId).catch(() => {})
  }, [roomId])

  return (
    <div className={styles.sidebar}>
      {/* Room code */}
      <div className={styles.roomCode}>
        <span className="label-xs">Room</span>
        <button className={styles.codeBtn} onClick={copyRoomCode} title="Click to copy">
          <span className={`mono ${styles.code}`}>{roomId}</span>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
      </div>

      <div className={styles.divider} />

      {/* Users */}
      <div className={styles.usersSection}>
        <span className="label-xs" style={{ marginBottom: 10, display: 'block' }}>
          Participants ({users.length})
        </span>
        <div className={styles.userList}>
          {users.map(user => {
            const isSpeaking = speaking.get(user.id)
            const isMe = user.id === currentUserId
            return (
              <div key={user.id} className={styles.userRow}>
                <div
                  className={`${styles.avatar} ${isSpeaking ? styles.avatarSpeaking : ''}`}
                  style={{ background: user.color }}
                >
                  {user.name[0]?.toUpperCase()}
                  {isSpeaking && <div className={styles.speakRing} />}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.name} {isMe && <span className={styles.meBadge}>you</span>}
                  </span>
                  {isSpeaking && (
                    <span className={styles.speakingLabel}>Speaking…</span>
                  )}
                </div>
                {isMe && muted && (
                  <svg width="14" height="14" fill="none" stroke="var(--danger)" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div className={styles.divider} />

        {/* Voice controls */}
        <div className={styles.voiceSection}>
          <span className="label-xs" style={{ marginBottom: 8, display: 'block' }}>Voice Chat</span>
          {!voiceJoined ? (
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.8125rem' }} onClick={handleJoinVoice}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              Join Voice
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn ${muted ? 'btn-danger' : 'btn-ghost'}`}
                onClick={handleToggleMute}
                style={{ flex: 1, fontSize: '0.8125rem' }}
              >
                {muted ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
                    Unmute
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
                    Mute
                  </>
                )}
              </button>
            </div>
          )}
          <div className={`pill ${voiceJoined ? 'pill-success' : 'pill-neutral'}`} style={{ marginTop: 8, fontSize: '0.7rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: voiceJoined ? 'var(--success)' : 'var(--text-faint)' }} />
            {voiceJoined ? 'Connected' : 'Not connected'}
          </div>
        </div>
      </div>
    </div>
  )
}
