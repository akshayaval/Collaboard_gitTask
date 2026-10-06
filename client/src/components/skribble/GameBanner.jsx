// GameBanner.jsx — Shown to everyone during choosing and drawing phases

import React, { useState, useEffect, useMemo } from 'react'
import styles from './Skribble.module.css'

const ROUND_DURATION_S = 80

export default function GameBanner({
  phase,
  isDrawer,
  drawerName,
  maskedWord,
  myWord,
  roundEndsAt,
  roundNumber,
  totalTurns,
}) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!roundEndsAt || phase !== 'drawing') {
      setSecondsLeft(0)
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [roundEndsAt, phase])

  const timerFraction = roundEndsAt ? Math.max(0, (roundEndsAt - Date.now()) / (ROUND_DURATION_S * 1000)) : 0
  const timerColor = timerFraction > 0.4 ? '#10B981' : timerFraction > 0.2 ? '#F59E0B' : '#EF4444'

  // Render masked word with styled blanks
  const renderedWord = useMemo(() => {
    if (!maskedWord) return null
    return maskedWord.split('').map((ch, i) => {
      if (ch === ' ') return <span key={i} className={styles.wordSpace} />
      return (
        <span key={i} className={styles.wordBlank}>
          {ch === '_' ? '' : ch}
        </span>
      )
    })
  }, [maskedWord])

  if (phase === 'waiting') {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerWaiting}>⏳ Waiting for more players to join…</span>
      </div>
    )
  }

  if (phase === 'choosing') {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerChoosing}>
          {isDrawer ? '🎨 Pick your word…' : `🎨 ${drawerName} is choosing a word…`}
        </span>
        <span className={styles.bannerRound}>Round {roundNumber} / {totalTurns}</span>
      </div>
    )
  }

  if (phase === 'drawing') {
    return (
      <div className={`${styles.banner} ${styles.bannerDrawing}`}>
        {/* Left: who's drawing + word/blanks */}
        <div className={styles.bannerLeft}>
          {isDrawer ? (
            <span className={styles.bannerYourTurn}>✏️ Draw: <strong>{myWord}</strong></span>
          ) : (
            <span className={styles.bannerOtherTurn}>
              🖊 <strong>{drawerName}</strong> is drawing
            </span>
          )}
          <div className={styles.wordBlanks}>{renderedWord}</div>
        </div>

        {/* Right: countdown timer */}
        <div className={styles.timerWrap}>
          <div
            className={styles.timerRing}
            style={{ borderColor: timerColor }}
          >
            <span className={styles.timerNum} style={{ color: timerColor }}>
              {secondsLeft}
            </span>
          </div>
          <span className={styles.timerLabel}>sec</span>
        </div>

        {/* Center: turn indicator */}
        <div className={styles.bannerRight}>
          <span className={styles.bannerRound}>Turn {roundNumber} / {totalTurns}</span>
        </div>
      </div>
    )
  }

  if (phase === 'round_end') {
    return (
      <div className={`${styles.banner} ${styles.bannerRoundEnd}`}>
        <span className={styles.bannerRoundEndText}>⏱ Time's up! Scores updating…</span>
      </div>
    )
  }

  return null
}
