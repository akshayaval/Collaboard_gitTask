// WinnerModal.jsx — Game over screen with winner announcement

import React, { useMemo } from 'react'
import styles from './Skribble.module.css'

export default function WinnerModal({
  winnerIds = [],
  winnerNames = [],
  scores = {},
  users = [],
  currentUserId,
  onLeave,
  onRestart,
}) {
  const ranked = useMemo(() => {
    return users
      .map(u => ({ ...u, score: scores[u.id] ?? 0 }))
      .sort((a, b) => b.score - a.score)
  }, [scores, users])

  const isTie = winnerIds.length > 1
  const iAmWinner = winnerIds.includes(currentUserId)

  const winnerDisplay = isTie
    ? `🤝 It's a tie between ${winnerNames.join(' & ')}!`
    : `🏆 ${winnerNames[0] || 'Someone'} wins!`

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Game over">
      <div className={styles.winnerModal}>

        {/* Confetti-style header */}
        <div className={styles.winnerHeader}>
          <div className={styles.winnerTrophy}>{isTie ? '🤝' : '🏆'}</div>
          <h2 className={styles.winnerTitle}>{winnerDisplay}</h2>
          {iAmWinner && (
            <div className={styles.winnerYouBadge}>That's you! 🎉</div>
          )}
        </div>

        {/* Full ranked scoreboard */}
        <div className={styles.winnerScoreboard}>
          <h3 className={styles.winnerScoreTitle}>Final Scores</h3>
          <div className={styles.winnerScoreList}>
            {ranked.map((player, idx) => {
              const isMe = player.id === currentUserId
              const isWinner = winnerIds.includes(player.id)
              const initial = (player.name?.[0] || '?').toUpperCase()

              return (
                <div
                  key={player.id}
                  className={`${styles.winnerScoreRow} ${isWinner ? styles.winnerScoreRowWinner : ''} ${isMe ? styles.winnerScoreRowMe : ''}`}
                >
                  <span className={styles.winnerRank}>
                    {isWinner ? (isTie ? '🤝' : '🏆') : `#${idx + 1}`}
                  </span>
                  <div
                    className={styles.winnerAvatar}
                    style={{ background: player.color || '#60A5FA' }}
                  >
                    {initial}
                    {isWinner && <span className={styles.winnerAvatarCrown}>👑</span>}
                  </div>
                  <span className={styles.winnerName}>
                    {isMe ? 'You' : player.name}
                  </span>
                  <span className={styles.winnerScore}>{player.score} pts</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.winnerActions}>
          <button
            id="winner-restart-btn"
            className={styles.winnerRestartBtn}
            onClick={onRestart}
          >
            🔄 Play Again
          </button>
          <button
            id="winner-leave-btn"
            className={styles.winnerLeaveBtn}
            onClick={onLeave}
          >
            🚪 Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
