// Scoreboard.jsx — Live ranked scoreboard for Skribble mode

import React, { useMemo } from 'react'
import styles from './Skribble.module.css'

export default function Scoreboard({ scores = {}, users = [], currentUserId, drawerId }) {
  const ranked = useMemo(() => {
    const allScores = Object.values(scores)
    const max = allScores.length > 0 ? Math.max(...allScores) : 0
    const allZero = allScores.every(s => s === 0)

    return users
      .map(u => ({
        ...u,
        score: scores[u.id] ?? 0,
        isDrawer: u.id === drawerId,
        hasCrown: !allZero && scores[u.id] === max,
      }))
      .sort((a, b) => b.score - a.score)
  }, [scores, users, drawerId])

  return (
    <div className={styles.scoreboard}>
      <div className={styles.scoreboardHeader}>
        <span className={styles.scoreboardTitle}>🏅 Scoreboard</span>
      </div>

      <div className={styles.scoreList}>
        {ranked.map((player, idx) => {
          const isMe = player.id === currentUserId
          const initial = (player.name?.[0] || '?').toUpperCase()

          return (
            <div
              key={player.id}
              className={`${styles.scoreRow} ${isMe ? styles.scoreRowMe : ''}`}
            >
              {/* Rank number */}
              <span className={styles.scoreRank}>
                {idx === 0 && player.hasCrown ? '🏆' : `#${idx + 1}`}
              </span>

              {/* Avatar */}
              <div
                className={styles.scoreAvatar}
                style={{ background: player.color || '#60A5FA' }}
              >
                {initial}
              </div>

              {/* Name + badges */}
              <div className={styles.scoreName}>
                <span className={styles.scoreNameText}>
                  {isMe ? 'You' : player.name}
                  {player.hasCrown && <span className={styles.crownIcon} title="Leading!">👑</span>}
                </span>
                {player.isDrawer && (
                  <span className={styles.drawerBadge}>✏️ Drawing</span>
                )}
              </div>

              {/* Score */}
              <span className={styles.scorePoints}>{player.score}</span>
            </div>
          )
        })}

        {ranked.length === 0 && (
          <div className={styles.scoreEmpty}>No players yet</div>
        )}
      </div>
    </div>
  )
}
