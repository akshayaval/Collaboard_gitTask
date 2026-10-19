// WordRevealModal.jsx — Round end reveal overlay (~5s)

import React, { useMemo } from 'react'
import styles from './Skribble.module.css'

export default function WordRevealModal({
  word,
  reason = 'timeUp',
  roundScores = {},
  users = [],
  drawerId,
}) {
  const isAllGuessed = reason === 'allGuessed'
  const isDrawerLeft = reason === 'drawerLeft'

  const titleText = isAllGuessed
    ? '🎉 Everyone guessed it!'
    : isDrawerLeft
    ? '🚪 The drawer left the room!'
    : "⏱️ Time's up!"

  // Build points list for players who scored this round
  const scoringPlayers = useMemo(() => {
    return Object.entries(roundScores)
      .map(([uid, pts]) => {
        const u = users.find(user => user.id === uid)
        const isDrawer = uid === drawerId
        return {
          id: uid,
          name: u?.name || 'Someone',
          color: u?.color || '#60A5FA',
          pts,
          isDrawer,
        }
      })
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts - a.pts)
  }, [roundScores, users, drawerId])

  return (
    <div className={styles.revealBackdrop} role="dialog" aria-modal="true" aria-label="Round results">
      <div className={styles.revealModal}>
        <div className={styles.revealHeader}>
          <span className={styles.revealEmoji}>{isAllGuessed ? '🎉' : '⏱️'}</span>
          <h2 className={styles.revealTitle}>{titleText}</h2>
        </div>

        <div className={styles.revealWordBox}>
          <span className={styles.revealWordLabel}>The word was:</span>
          <span className={styles.revealWord}>{word ? word.toUpperCase() : '???'}</span>
        </div>

        <div className={styles.revealScoresSection}>
          <h4 className={styles.revealScoresTitle}>Round Points</h4>
          {scoringPlayers.length > 0 ? (
            <div className={styles.revealScoresList}>
              {scoringPlayers.map(p => (
                <div key={p.id} className={styles.revealScoreRow}>
                  <div className={styles.revealPlayerInfo}>
                    <span
                      className={styles.revealAvatar}
                      style={{ background: p.color }}
                    >
                      {(p.name[0] || '?').toUpperCase()}
                    </span>
                    <span className={styles.revealPlayerName}>
                      {p.name} {p.isDrawer ? '(Drawer)' : ''}
                    </span>
                  </div>
                  <span className={styles.revealPtsBadge}>+{p.pts} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.revealNoScores}>No one guessed the word this round!</div>
          )}
        </div>

        <div className={styles.revealFooter}>
          <span className={styles.revealCountdown}>Next turn starting soon…</span>
          <div className={styles.revealProgressBar}>
            <div className={styles.revealProgressFill} />
          </div>
        </div>
      </div>
    </div>
  )
}
