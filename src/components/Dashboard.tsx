import { useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Background from './Background'
import CountdownTimer from './CountdownTimer'
import TwistedEnvelope from './TwistedEnvelope'
import AdminSidebar from './AdminSidebar'
import type { AdminState } from './SettingsPanel'

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

let inMemoryAdminToken: string | null = null

function getStoredToken(): string | null {
  if (inMemoryAdminToken) return inMemoryAdminToken
  try {
    if (typeof window !== 'undefined') {
      const stored =
        localStorage.getItem('missionathon_token') || sessionStorage.getItem('missionathon_token')
      if (stored) {
        inMemoryAdminToken = stored
        return stored
      }
    }
  } catch {
    // Storage restricted in sandboxed iframe environment
  }
  return null
}

function setStoredToken(token: string | null) {
  inMemoryAdminToken = token
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('missionathon_token', token)
        sessionStorage.setItem('missionathon_token', token)
      } else {
        localStorage.removeItem('missionathon_token')
        sessionStorage.removeItem('missionathon_token')
      }
    }
  } catch {
    // Storage restricted
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken()

  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('X-Admin-Token', token)
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminState, setAdminState] = useState<AdminState | null>(null)
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)
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

  // Check Admin Session and Load Admin State if Authenticated
  const refreshAdminState = useCallback(async () => {
    try {
      const session = await requestJson<{ isAdmin: boolean }>('/api/session')
      setIsAdmin(session.isAdmin)
      if (session.isAdmin) {
        const fullAdmin = await requestJson<AdminState>('/api/admin/event-state')
        setAdminState(fullAdmin)
      } else {
        setAdminState(null)
      }
    } catch {
      setIsAdmin(false)
      setAdminState(null)
    }
  }, [])

  // 1. Initial State Fetch and SSE Real-time Synchronizer
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
      if (!isCancelled) {
        await refreshAdminState()
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
  }, [applyStatePayload, refreshAdminState])

  // Admin Actions
  const handleTimerControl = async (
    action: string,
    hours?: number,
    minutes?: number,
    seconds?: number,
    extra?: Record<string, any>
  ) => {
    const updated = await requestJson<AdminState>('/api/admin/timer-control', {
      method: 'POST',
      body: JSON.stringify({ action, hours, minutes, seconds, ...extra }),
    })
    setAdminState(updated)
    applyStatePayload(updated as unknown as PublicEventState)
  }

  const handleSaveMissionContent = async (content: {
    title: string
    text: string
    image: string
    revealType: 'image' | 'text' | 'both'
  }) => {
    const updated = await requestJson<AdminState>('/api/admin/mission-content', {
      method: 'POST',
      body: JSON.stringify(content),
    })
    setAdminState(updated)
    applyStatePayload(updated as unknown as PublicEventState)
  }

  const handleUploadImage = async (base64Data: string, filename: string) => {
    const res = await requestJson<{ adminState: AdminState }>('/api/admin/upload-image', {
      method: 'POST',
      body: JSON.stringify({ base64Data, filename }),
    })
    if (res.adminState) {
      setAdminState(res.adminState)
      applyStatePayload(res.adminState as unknown as PublicEventState)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    const res = await requestJson<{ isAdmin: boolean; token?: string; error?: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (!res.isAdmin && !res.token) {
      throw new Error(res.error || 'Authentication denied. Verify credentials.')
    }

    if (res.token) {
      setStoredToken(res.token)
    }

    try {
      const fullAdmin = await requestJson<AdminState>('/api/admin/event-state', {
        headers: res.token
          ? { Authorization: `Bearer ${res.token}`, 'X-Admin-Token': res.token }
          : {},
      })
      setAdminState(fullAdmin)
    } catch {
      // If fetching full admin state has an issue, construct minimal admin state
      setAdminState((prev) => prev || (eventState as unknown as AdminState))
    }

    setIsAdmin(true)
    setIsAdminPanelOpen(true)
  }

  const handleLogout = async () => {
    try {
      await requestJson<{ isAdmin: boolean }>('/api/logout', { method: 'POST' })
    } catch {
      // Ignore
    }
    setStoredToken(null)
    setIsAdmin(false)
    setAdminState(null)
    setIsAdminPanelOpen(false)
  }

  const isRevealedMode = eventState.isRevealed || eventState.status === 'completed'

  return (
    <div className={`heist-app-wrapper ${isAdminPanelOpen ? 'heist-app-wrapper--sidebar-open' : ''}`}>
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

        {/* Public Display Area (No generic cards, no boxes around timer!) */}
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

        {/* Unobtrusive Admin Sidebar Trigger */}
        <button
          type="button"
          className={`unobtrusive-admin-trigger ${isAdminPanelOpen ? 'is-active' : ''}`}
          onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
          title={isAdminPanelOpen ? 'Collapse Admin Sidebar' : 'Admin Command Access'}
          aria-label="Admin Access"
        >
          <svg
            className="unobtrusive-admin-lock-icon"
            width="11"
            height="12"
            viewBox="0 0 12 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="1" y="5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M3.5 5V3.5C3.5 2.11929 4.61929 1 6 1C7.38071 1 8.5 2.11929 8.5 3.5V5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="unobtrusive-admin-text">
            {isAdminPanelOpen ? 'CLOSE SIDEBAR' : isAdmin ? 'COMMAND CONSOLE' : 'ADMIN'}
          </span>
        </button>
      </main>

      {/* Standalone Admin Sidebar (Not a popup! Direct split-screen live control) */}
      <AdminSidebar
        isOpen={isAdminPanelOpen}
        isAdmin={isAdmin}
        adminState={adminState || (eventState as unknown as AdminState)}
        onClose={() => setIsAdminPanelOpen(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onTimerControl={handleTimerControl}
        onSaveMissionContent={handleSaveMissionContent}
        onUploadImage={handleUploadImage}
      />
    </div>
  )
}
