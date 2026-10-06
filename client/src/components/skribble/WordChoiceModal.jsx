// WordChoiceModal.jsx — Shown only to the drawer during 'choosing' phase

import React, { useState, useEffect } from 'react'
import styles from './Skribble.module.css'

export default function WordChoiceModal({ words = [], timeoutMs = 10000, onChoose }) {
  const [timeLeft, setTimeLeft] = useState(Math.ceil(timeoutMs / 1000))

  useEffect(() => {
    setTimeLeft(Math.ceil(timeoutMs / 1000))
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [timeoutMs, words])

  const urgency = timeLeft <= 3 ? 'urgent' : timeLeft <= 6 ? 'warning' : 'ok'

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Choose a word to draw">
        <div className={styles.modalHeader}>
          <div className={styles.modalEmoji}>🎨</div>
          <h2 className={styles.modalTitle}>Choose a word to draw!</h2>
          <p className={styles.modalSubtitle}>Your teammates will try to guess it</p>
        </div>

        {/* Countdown ring */}
        <div className={`${styles.countdownRing} ${styles[`countdown${urgency.charAt(0).toUpperCase() + urgency.slice(1)}`]}`}>
          <span className={styles.countdownNum}>{timeLeft}</span>
          <span className={styles.countdownSuffix}>s</span>
        </div>

        <div className={styles.wordChoices}>
          {words.map((word) => (
            <button
              key={word}
              className={styles.wordChoiceBtn}
              onClick={() => onChoose(word)}
              id={`word-choice-${word}`}
            >
              {word}
            </button>
          ))}
        </div>

        <p className={styles.autoPickNote}>
          A word will be auto-selected if time runs out
        </p>
      </div>
    </div>
  )
}
