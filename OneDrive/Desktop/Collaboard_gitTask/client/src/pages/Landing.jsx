// Landing.jsx -- Room entry page -- redesigned to match reference UI

import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import styles from './Landing.module.css'

const PRESET_COLORS = [
  '#60A5FA', '#F472B6', '#34D399', '#FBBF24',
  '#A78BFA', '#FB923C', '#F87171', '#2DD4BF',
]

export default function Landing() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [roomInput, setRoomInput] = useState('')
  const [tab, setTab] = useState('create')
  const [error, setError] = useState('')

  const saveSession = (data) => {
    sessionStorage.setItem('collaboard_user', JSON.stringify(data))
  }

  const handleCreate = useCallback(() => {
    if (!name.trim()) { setError('Please enter your name'); return }
    const roomId = uuidv4().slice(0, 8).toUpperCase()
    saveSession({ name: name.trim(), color })
    navigate(`/room/${roomId}`)
  }, [name, color, navigate])

  const handleJoin = useCallback(() => {
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!roomInput.trim()) { setError('Please enter a room code'); return }
    saveSession({ name: name.trim(), color })
    navigate(`/room/${roomInput.trim().toUpperCase()}`)
  }, [name, color, roomInput, navigate])

  return (
    <div className={styles.page}>

      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLogo}>
          <div className={styles.navLogoIcon}>
            <div className={styles.logoGrid}>
              <div style={{ background: '#4ADE80' }} />
              <div style={{ background: '#60A5FA' }} />
              <div style={{ background: '#F472B6' }} />
              <div style={{ background: '#FBBF24' }} />
            </div>
          </div>
          <span className={styles.navLogoText}>Collaboard</span>
        </div>
        <button className={styles.navCta} onClick={() => document.getElementById('name-input').focus()}>
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <main className={styles.hero}>

        {/* Sticky notes */}
        <div className={`${styles.sticky} ${styles.stickyPink}`}>
          <svg width="56" height="56" fill="none" viewBox="0 0 56 56">
            <circle cx="28" cy="22" r="10" stroke="#1a1a1a" strokeWidth="2.5" fill="none"/>
            <path d="M28 32 L22 44 L28 40 L34 44 Z" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinejoin="round"/>
            <line x1="28" y1="6" x2="28" y2="10" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="28" cy="6" r="2" fill="#FBBF24"/>
          </svg>
        </div>
        <div className={`${styles.sticky} ${styles.stickyYellow}`}>
          <svg width="56" height="56" fill="none" viewBox="0 0 56 56">
            <rect x="8" y="22" width="10" height="14" rx="1" stroke="#1a1a1a" strokeWidth="2"/>
            <rect x="23" y="14" width="10" height="22" rx="1" stroke="#1a1a1a" strokeWidth="2"/>
            <rect x="38" y="10" width="10" height="26" rx="1" stroke="#1a1a1a" strokeWidth="2"/>
          </svg>
        </div>
        <div className={`${styles.sticky} ${styles.stickyGreen}`}>
          <svg width="56" height="56" fill="none" viewBox="0 0 56 56">
            <rect x="8" y="12" width="40" height="28" rx="3" stroke="#1a1a1a" strokeWidth="2"/>
            <rect x="14" y="18" width="10" height="8" rx="1" stroke="#1a1a1a" strokeWidth="1.5"/>
            <rect x="30" y="18" width="12" height="3" rx="1" fill="#1a1a1a" opacity="0.3"/>
            <rect x="14" y="30" width="28" height="2" rx="1" fill="#1a1a1a" opacity="0.15"/>
          </svg>
        </div>
        <div className={`${styles.sticky} ${styles.stickyBlue}`}>
          <svg width="56" height="56" fill="none" viewBox="0 0 56 56">
            <path d="M14 36 Q28 14 42 28" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <circle cx="42" cy="28" r="3" fill="#1a1a1a"/>
          </svg>
        </div>

        {/* Deco elements */}
        <div className={`${styles.decoShape} ${styles.decoArrowBlue}`}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 4L18 18M18 18H8M18 18V8" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={`${styles.decoShape} ${styles.decoArrowOrange}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 10 L18 10 M12 4 L18 10 L12 16" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={`${styles.decoShape} ${styles.decoWave}`}>
          <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
            <path d="M2 8 Q7 2 14 8 Q21 14 26 8" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div className={`${styles.decoShape} ${styles.decoSparkle}`}>*</div>
        <div className={`${styles.decoShape} ${styles.decoSparkle2}`}>*</div>
        <div className={`${styles.decoShape} ${styles.decoCurveArrow}`}>
          <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
            <path d="M2 4 Q20 2 30 20" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M25 22 L30 20 L27 15" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Cursor labels */}
        <div className={`${styles.cursor} ${styles.cursorSam}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 8L8 9.5L6 14L2 2Z" fill="#3B82F6"/>
          </svg>
          <span className={styles.cursorLabel} style={{ background: '#EF4444' }}>Sam</span>
        </div>
        <div className={`${styles.cursor} ${styles.cursorPriya}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 8L8 9.5L6 14L2 2Z" fill="#22C55E"/>
          </svg>
          <span className={styles.cursorLabel} style={{ background: '#22C55E' }}>Priya</span>
        </div>

        <div className={styles.hashChip}>#Idea</div>

        {/* Center hero content */}
        <div className={styles.heroCenter}>
          <div className={styles.socialProof}>
            <div className={styles.avatarStack}>
              <div className={styles.miniAvatar} style={{ background: '#F472B6', zIndex: 3 }}>A</div>
              <div className={styles.miniAvatar} style={{ background: '#60A5FA', zIndex: 2 }}>B</div>
              <div className={styles.miniAvatar} style={{ background: '#34D399', zIndex: 1 }}>C</div>
            </div>
            <span>10K+ teams already collaboarding</span>
          </div>

          <h1 className={styles.headline}>
            Where <span className={styles.headlineAccent}>Ideas</span><br />
            Come Together
          </h1>

          <p className={styles.heroSub}>
            The infinite online whiteboard for teams to brainstorm,<br />
            plan, design, and collaborate in real time.
          </p>

          <div className={styles.ctaForm}>
            <div className={styles.nameRow}>
              <input
                id="name-input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
                className={styles.nameInput}
                maxLength={24}
              />
              <div className={styles.colorDots}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    className={`${styles.colorDot} ${color === c ? styles.colorDotActive : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className={styles.tabRow}>
              <button
                className={`${styles.tabPill} ${tab === 'create' ? styles.tabPillActive : ''}`}
                onClick={() => setTab('create')}
              >
                Create Room
              </button>
              <button
                className={`${styles.tabPill} ${tab === 'join' ? styles.tabPillActive : ''}`}
                onClick={() => setTab('join')}
              >
                Join Room
              </button>
            </div>

            {tab === 'create' ? (
              <button className={styles.ctaButton} onClick={handleCreate}>
                Start Collaboarding
              </button>
            ) : (
              <div className={styles.joinRow}>
                <input
                  type="text"
                  placeholder="Room code (e.g. A1B2C3D4)"
                  value={roomInput}
                  onChange={e => { setRoomInput(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  className={styles.nameInput}
                  maxLength={8}
                  style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}
                />
                <button className={styles.ctaButton} onClick={handleJoin}>Join</button>
              </div>
            )}

            {error && <div className={styles.errorMsg}>{error}</div>}

            <button className={styles.watchLink}>
              <span className={styles.playIcon}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <polygon points="2,1 9,5 2,9"/>
                </svg>
              </span>
              Watch how it works
            </button>
          </div>
        </div>
      </main>

    </div>
  )
}