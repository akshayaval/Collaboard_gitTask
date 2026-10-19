// LobbyPanel.jsx — Skribble lobby UI shown before host starts game

import React, { useState } from 'react'
import styles from './Skribble.module.css'

export default function LobbyPanel({
  users = [],
  hostId,
  currentUserId,
  isHost,
  maxPlayers = 4,
  roomId,
  onStartGame,
  onShare,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (onShare) onShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canStart = users.length >= 2

  return (
    <div className={styles.lobbyBar} role="region" aria-label="Game lobby">
      {/* Left side: title + player count + participant chips */}
      <div className={styles.lobbyLeft}>
        <div className={styles.lobbyTitleRow}>
          <span className={styles.lobbyBadge}>🎮 Lobby</span>
          <span className={styles.lobbyCount}>
            Players joined: <strong>{users.length}</strong> / {maxPlayers}
          </span>
        </div>

        <div className={styles.lobbyParticipants}>
          {users.map(u => {
            const isUserHost = u.id === hostId
            const isMe = u.id === currentUserId
            const initial = (u.name?.[0] || '?').toUpperCase()

            return (
              <div
                key={u.id}
                className={`${styles.lobbyPlayerChip} ${isUserHost ? styles.lobbyPlayerChipHost : ''}`}
                title={u.name}
              >
                <span
                  className={styles.lobbyAvatar}
                  style={{ background: u.color || '#60A5FA' }}
                >
                  {initial}
                </span>
                <span className={styles.lobbyPlayerName}>
                  {u.name} {isMe ? '(You)' : ''}
                </span>
                {isUserHost && <span className={styles.lobbyHostBadge} title="Room Host">👑 Host</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right side: Host Start button or waiting banner + Room share */}
      <div className={styles.lobbyRight}>
        <div className={styles.lobbyShareWrap}>
          <span className={styles.lobbyCodeLabel}>Code:</span>
          <span className={styles.lobbyCodePill}>{roomId}</span>
          <button
            type="button"
            className={styles.lobbyShareBtn}
            onClick={handleCopy}
            title="Copy invite link"
          >
            {copied ? '✓ Copied' : '🔗 Invite'}
          </button>
        </div>

        {isHost ? (
          <div className={styles.lobbyHostAction}>
            <button
              id="start-game-btn"
              type="button"
              className={styles.lobbyStartBtn}
              onClick={onStartGame}
              disabled={!canStart}
              title={!canStart ? 'Need at least 2 players to start' : 'Start the Skribble game'}
            >
              🚀 Start Game
            </button>
            {!canStart && (
              <span className={styles.lobbyStartHint}>Need at least 2 players</span>
            )}
          </div>
        ) : (
          <div className={styles.lobbyWaitingMsg}>
            <span className={styles.lobbyPulseDot} />
            Waiting for the host to start the game…
          </div>
        )}
      </div>
    </div>
  )
}
