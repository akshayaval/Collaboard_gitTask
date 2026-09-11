// useVoiceChat.js — WebRTC mesh topology + audio level detection

import { useRef, useCallback, useEffect } from 'react'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function useVoiceChat(socketRef, userIdRef, users, onSpeaking) {
  const localStream = useRef(null)
  const peers = useRef(new Map())        // peerId -> RTCPeerConnection
  const audioCtx = useRef(null)
  const analyserNodes = useRef(new Map()) // peerId -> { analyser, source }
  const speakingInterval = useRef(null)
  const isMuted = useRef(false)
  const enabled = useRef(false)

  // ── Start voice ──────────────────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    if (enabled.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStream.current = stream
      enabled.current = true

      audioCtx.current = new AudioContext()
      const source = audioCtx.current.createMediaStreamSource(stream)
      const analyser = audioCtx.current.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      // Self-speaking detection
      const data = new Uint8Array(analyser.frequencyBinCount)
      let lastSpeak = false
      speakingInterval.current = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const speaking = avg > 12
        if (speaking !== lastSpeak) {
          lastSpeak = speaking
          onSpeaking?.(userIdRef.current, speaking)
          socketRef?.current?.emit('voice:speaking', { isSpeaking: speaking })
        }
      }, 150)

      return stream
    } catch (err) {
      console.warn('[voice] getUserMedia failed:', err.message)
      return null
    }
  }, [socketRef, userIdRef, onSpeaking])

  // ── Create peer connection ────────────────────────────────────────────────
  const createPeer = useCallback((peerId, initiator) => {
    if (peers.current.has(peerId)) return peers.current.get(peerId)

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peers.current.set(peerId, pc)

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
    }

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef?.current?.emit('voice:ice', { to: peerId, candidate: e.candidate })
      }
    }

    // Remote audio
    pc.ontrack = (e) => {
      const remoteStream = e.streams[0]
      if (!remoteStream) return
      const audio = new Audio()
      audio.srcObject = remoteStream
      audio.play().catch(() => {})

      // Remote speaking detection
      if (audioCtx.current) {
        const src = audioCtx.current.createMediaStreamSource(remoteStream)
        const analyser = audioCtx.current.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        analyserNodes.current.set(peerId, { analyser, source: src })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peers.current.delete(peerId)
      }
    }

    // Initiator creates offer
    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef?.current?.emit('voice:offer', { to: peerId, offer: pc.localDescription })
        })
        .catch(console.warn)
    }

    return pc
  }, [socketRef])

  // ── Socket signaling handlers ─────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return

    const onOffer = async ({ from, offer }) => {
      if (!enabled.current) await startVoice()
      const pc = createPeer(from, false)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socketRef?.current?.emit('voice:answer', { to: from, answer: pc.localDescription })
    }

    const onAnswer = async ({ from, answer }) => {
      const pc = peers.current.get(from)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }

    const onIce = async ({ from, candidate }) => {
      const pc = peers.current.get(from)
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }

    socket.on('voice:offer', onOffer)
    socket.on('voice:answer', onAnswer)
    socket.on('voice:ice', onIce)

    return () => {
      socket.off('voice:offer', onOffer)
      socket.off('voice:answer', onAnswer)
      socket.off('voice:ice', onIce)
    }
  }, [socketRef, createPeer, startVoice])


  // ── Join voice call (called on room join) ─────────────────────────────────
  const joinCall = useCallback(async () => {
    const stream = await startVoice()
    if (!stream) return

    // Send offers to all existing users
    for (const user of users) {
      if (user.id !== userIdRef.current) {
        createPeer(user.id, true)
      }
    }
  }, [startVoice, users, userIdRef, createPeer])

  // ── Initiate peer with new user ───────────────────────────────────────────
  const connectToPeer = useCallback((peerId) => {
    if (!enabled.current) return
    createPeer(peerId, true)
  }, [createPeer])

  // ── Mute/unmute ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStream.current
    if (!stream) return false
    isMuted.current = !isMuted.current
    stream.getAudioTracks().forEach(t => { t.enabled = !isMuted.current })
    return isMuted.current
  }, [])

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const stopVoice = useCallback(() => {
    clearInterval(speakingInterval.current)
    peers.current.forEach(pc => pc.close())
    peers.current.clear()
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    enabled.current = false
  }, [])

  useEffect(() => () => stopVoice(), [stopVoice])

  return { joinCall, connectToPeer, toggleMute, stopVoice, isEnabled: enabled }
}
