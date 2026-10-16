import { useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Background from './Background'
import CountdownTimer from './CountdownTimer'
import TwistedEnvelope from './TwistedEnvelope'

const missionathonLogo = encodeURI('/WhatsApp Image 2026-10-06 at 10.12.02 PM.jpeg')

export type PublicEventState = {
  status: 'not_started' | 'running' | 'paused' | 'completed'
  durationSeconds: number
  remainingSeconds: number
  targetEndTime: number | null
  startedAt: number | null
  pausedAt: number | null
  serverTime: number
  isRevealed: boolean
  mission: {
    title: string
    text: string
    image: string
    revealType: 'image' | 'text' | 'both'
  }
}

const DEFAULT_PUBLIC_STATE: PublicEventState = {
  status: 'not_started',
  durationSeconds: 12 * 3600 + 30 * 60 + 45,
  remainingSeconds: 12 * 3600 + 30 * 60 + 45,
  targetEndTime: null,
  startedAt: null,
  pausedAt: null,
  serverTime: Date.now(),
  isRevealed: false,
  mission: {
    title: '',
    text: '',
    image: '',
    revealType: 'both',
  },
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  })

  let result: any = {}
  try {
    result = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned error (${response.status})`)
    }
  }

  if (!response.ok) {
    throw new Error(result?.error || `Request failed (${response.status})`)
  }
  return result as T
}

export default function Dashboard() {
  const [eventState, setEventState] = useState<PublicEventState>(DEFAULT_PUBLIC_STATE)
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Synchronize state from payload
  const applyStatePayload = useCallback((payload: PublicEventState) => {
    if (payload.serverTime) {
      setServerTimeOffset(payload.serverTime - Date.now())
    }
    setEventState(payload)
    setIsLoading(false)
  }, [])

  // Initial State Fetch and SSE Real-time Synchronizer
  useEffect(() => {
    let isCancelled = false

    const fetchInitial = async () => {
      try {
        const initial = await requestJson<PublicEventState>('/api/event-state')
        if (!isCancelled) {
          applyStatePayload(initial)
        }
      } catch (err) {
        console.error('Initial state fetch error:', err)
      }
    }

    void fetchInitial()

    // Setup Server-Sent Events (SSE)
    if (typeof window !== 'undefined' && window.EventSource) {
      try {
        const es = new EventSource('/api/events')
        eventSourceRef.current = es

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as PublicEventState
            if (!isCancelled) {
              applyStatePayload(data)
            }
          } catch {
            // Ignore malformed SSE packets
          }
        }

        es.onerror = () => {
          // Fallback to polling if SSE drops
        }
      } catch (e) {
        console.warn('SSE not initialized, relying on heartbeat polling:', e)
      }
    }

    // Reliable 4-second heartbeat fallback
    const interval = setInterval(() => {
      if (!isCancelled) {
        requestJson<PublicEventState>('/api/event-state')
          .then((data) => {
            if (!isCancelled) applyStatePayload(data)
          })
          .catch(() => {})
      }
    }, 4000)

    return () => {
      isCancelled = true
      clearInterval(interval)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [applyStatePayload])

  const isRevealedMode = eventState.isRevealed || eventState.status === 'completed'

  return (
    <div className="heist-app-wrapper">
      {/* Full-screen Money Heist atmosphere */}
      <Background />

      <main className="dashboard-cinematic-stage">
        {/* Top Header - Missionathon Publicity Identity */}
        <header
          className={`heist-brand-header ${isRevealedMode ? 'heist-brand-header--dimmed' : ''}`}
          aria-label="Missionathon Event"
        >
          <img
            className="heist-brand-logo"
            src={missionathonLogo}
            alt="Missionathon"
          />
        </header>

        {/* Public Display Area (Watch-only full screen countdown experience) */}
        {isLoading ? (
          <div className="heist-loading-text">SYNCHRONIZING WITH MISSIONATHON SERVER...</div>
        ) : (
          <div className="heist-public-composition">
            <AnimatePresence mode="wait">
              {!isRevealedMode ? (
                /* 1. Cinematic Money Heist Countdown (Dominant full-screen stage) */
                <motion.div
                  key="countdown-stage"
                  className="heist-countdown-stage"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.96 }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CountdownTimer
                    status={eventState.status}
                    targetEndTime={eventState.targetEndTime}
                    remainingSeconds={eventState.remainingSeconds}
                    serverTimeOffset={serverTimeOffset}
                    onZeroReached={() => {
                      void requestJson<PublicEventState>('/api/event-state').then(applyStatePayload)
                    }}
                  />
                </motion.div>
              ) : (
                /* 2. Physical 3D Sealed Envelope & Continuous Zoom Card Reveal */
                <motion.div
                  key="envelope-stage"
                  className="heist-envelope-stage"
                  initial={{ opacity: 0, scale: 0.94, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TwistedEnvelope
                    isRevealed={isRevealedMode}
                    mission={eventState.mission}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
