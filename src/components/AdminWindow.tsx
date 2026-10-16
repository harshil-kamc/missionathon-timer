import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react'
import Background from './Background'
import type { AdminState } from './SettingsPanel'

const missionathonLogo = encodeURI('/WhatsApp Image 2026-10-06 at 10.12.02 PM.jpeg')

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
    // Restricted in sandboxed environments
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
    // Ignore storage errors
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init?.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, { ...init, headers })
  if (!response.ok) {
    let errorMsg = `Server response ${response.status}`
    try {
      const data = await response.json()
      if (data?.error) errorMsg = data.error
    } catch {
      // Ignore
    }
    throw new Error(errorMsg)
  }
  return response.json() as Promise<T>
}

function calculateImageSpecs(width: number, height: number): {
  ratioText: string
  recPresentation: string
  note: string
} {
  if (!width || !height) {
    return {
      ratioText: '16:9',
      recPresentation: '16:9',
      note: 'Prepare artwork at approximately 1920 × 1080 px for this card ratio.',
    }
  }

  const floatRatio = width / height
  const standardRatios = [
    { name: '16:9', val: 16 / 9, recW: 1920, recH: 1080 },
    { name: '3:4', val: 3 / 4, recW: 1200, recH: 1600 },
    { name: '4:3', val: 4 / 3, recW: 1600, recH: 1200 },
    { name: '1:1', val: 1, recW: 1200, recH: 1200 },
    { name: '9:16', val: 9 / 16, recW: 1080, recH: 1920 },
    { name: '21:9', val: 21 / 9, recW: 2560, recH: 1080 },
    { name: '2:3', val: 2 / 3, recW: 1200, recH: 1800 },
    { name: '3:2', val: 3 / 2, recW: 1800, recH: 1200 },
  ]

  for (const std of standardRatios) {
    if (Math.abs(floatRatio - std.val) < 0.04) {
      return {
        ratioText: std.name,
        recPresentation: std.name,
        note: `Prepare artwork at approximately ${std.recW} × ${std.recH} px for this card ratio.`,
      }
    }
  }

  return {
    ratioText: `${width}:${height}`,
    recPresentation: `${Math.round(floatRatio * 100) / 100}:1`,
    note: `Exact artwork aspect ratio is ${Math.round(floatRatio * 100) / 100}:1. Preserved with 100% fidelity without cropping.`,
  }
}

type AdminWindowProps = {
  onNavigateToHome?: () => void
}

export default function AdminWindow({ onNavigateToHome }: AdminWindowProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminState, setAdminState] = useState<AdminState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Login credentials
  const [loginEmail, setLoginEmail] = useState('harshil@h.k')
  const [loginPassword, setLoginPassword] = useState('missionathon@tech')
  const [loginError, setLoginError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Active tab in console
  const [activeTab, setActiveTab] = useState<'timer' | 'mission' | 'audit'>('timer')
  const [timerMode, setTimerMode] = useState<'duration' | 'target'>('duration')

  // Timer controls
  const [hours, setHours] = useState(12)
  const [minutes, setMinutes] = useState(30)
  const [seconds, setSeconds] = useState(45)
  const [targetDate, setTargetDate] = useState('2026-10-15')
  const [targetTime, setTargetTime] = useState('18:00')
  const [timezone, setTimezone] = useState('UTC')

  // Mission controls
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('/mission-image.jpg')
  const [revealType, setRevealType] = useState<'image' | 'text' | 'both'>('image')
  const [isUploading, setIsUploading] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  // Feedback states
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  // Detect image dimensions
  useEffect(() => {
    if (!imageUrl) {
      setImageDimensions(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      setImageDimensions(null)
    }
    img.src = imageUrl
  }, [imageUrl])

  const showSuccess = (msg: string) => {
    setStatusMessage(msg)
    setErrorMessage('')
    window.setTimeout(() => setStatusMessage(''), 4500)
  }

  const showError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    setErrorMessage(msg)
    setStatusMessage('')
  }

  // Load session & event state
  const loadAdminState = useCallback(async () => {
    try {
      const session = await requestJson<{ isAdmin: boolean }>('/api/session')
      setIsAdmin(session.isAdmin)
      if (session.isAdmin) {
        const fullAdmin = await requestJson<AdminState>('/api/admin/event-state')
        setAdminState(fullAdmin)

        // Sync inputs
        const h = Math.floor(fullAdmin.durationSeconds / 3600)
        const m = Math.floor((fullAdmin.durationSeconds % 3600) / 60)
        const s = fullAdmin.durationSeconds % 60
        setHours(h)
        setMinutes(m)
        setSeconds(s)
        if (fullAdmin.targetDate) setTargetDate(fullAdmin.targetDate)
        if (fullAdmin.targetTime) setTargetTime(fullAdmin.targetTime.slice(0, 5))
        if (fullAdmin.timezone) setTimezone(fullAdmin.timezone)
        setTitle(fullAdmin.mission.title)
        setText(fullAdmin.mission.text)
        setImageUrl(fullAdmin.mission.image)
        setRevealType(fullAdmin.mission.revealType || 'image')
      } else {
        setAdminState(null)
      }
    } catch {
      setIsAdmin(false)
      setAdminState(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAdminState()

    // 4-second refresh loop for live sync
    const interval = setInterval(() => {
      if (isAdmin) {
        requestJson<AdminState>('/api/admin/event-state')
          .then((state) => setAdminState(state))
          .catch(() => {})
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [isAdmin, loadAdminState])

  // Login
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsAuthenticating(true)
    try {
      const data = await requestJson<{ token: string; isAdmin: boolean }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword.trim() }),
      })
      if (data.token) {
        setStoredToken(data.token)
      }
      setIsAdmin(true)
      await loadAdminState()
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials. Access denied.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    try {
      await requestJson<{ isAdmin: boolean }>('/api/logout', { method: 'POST' })
    } catch {
      // Ignore
    }
    setStoredToken(null)
    setIsAdmin(false)
    setAdminState(null)
  }

  // Timer controls
  const handleTimerControl = async (
    action: string,
    h?: number,
    m?: number,
    s?: number,
    extra?: Record<string, any>
  ) => {
    setIsBusy(true)
    try {
      const updated = await requestJson<AdminState>('/api/admin/timer-control', {
        method: 'POST',
        body: JSON.stringify({ action, hours: h, minutes: m, seconds: s, ...extra }),
      })
      setAdminState(updated)
      if (action === 'start') showSuccess('Countdown clock started!')
      if (action === 'pause') showSuccess('Countdown suspended')
      if (action === 'resume') showSuccess('Countdown resumed')
      if (action === 'reset') showSuccess('Countdown reset to default')
      if (action === 'emergency_reveal') showSuccess('Direct emergency envelope reveal activated!')
      if (action === 'reseal') showSuccess('Dossier returned to sealed envelope')
      if (action === 'set_target') showSuccess(`Target schedule saved: ${extra?.targetDate} ${extra?.targetTime} (${extra?.timezone})`)
    } catch (err) {
      showError(err)
    } finally {
      setIsBusy(false)
    }
  }

  // Save mission
  const handleSaveMission = async (e: FormEvent) => {
    e.preventDefault()
    setIsBusy(true)
    try {
      const updated = await requestJson<AdminState>('/api/admin/mission-content', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          text: text.trim(),
          image: imageUrl.trim(),
          revealType,
        }),
      })
      setAdminState(updated)
      showSuccess('Mission dossier parameters saved!')
    } catch (err) {
      showError(err)
    } finally {
      setIsBusy(false)
    }
  }

  // Upload image
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file (JPG, PNG, WEBP, etc.)')
      return
    }

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string
        const res = await requestJson<{ adminState: AdminState }>('/api/admin/upload-image', {
          method: 'POST',
          body: JSON.stringify({ base64Data, filename: file.name }),
        })
        if (res.adminState) {
          setAdminState(res.adminState)
          setImageUrl(res.adminState.mission.image)
        }
        showSuccess(`Uploaded ${file.name} successfully! Aspect ratio preserved.`)
      } catch (err) {
        showError(err)
      } finally {
        setIsUploading(false)
      }
    }
    reader.onerror = () => {
      showError('Failed to read image file')
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const imageSpecs = imageDimensions
    ? calculateImageSpecs(imageDimensions.width, imageDimensions.height)
    : null

  return (
    <div className="admin-window-page">
      <Background />

      <div className="admin-window-container">
        {/* Top App Header */}
        <header className="admin-window-header">
          <div className="admin-window-header-left">
            <img src={missionathonLogo} alt="Missionathon" className="admin-window-logo" />
            <div className="admin-window-badge">
              <span className="admin-window-bullet">&#9670;</span>
              <span>COMMAND & CUSTOMIZATION DIRECTORY</span>
            </div>
          </div>

          <div className="admin-window-header-right">
            <button
              type="button"
              className="admin-window-action-btn"
              onClick={() => {
                if (onNavigateToHome) {
                  onNavigateToHome()
                } else {
                  window.location.href = '/'
                }
              }}
              title="Return to Public Live Countdown"
            >
              &larr; LIVE COUNTDOWN SCREEN
            </button>

            {isAdmin && (
              <button
                type="button"
                className="admin-window-action-btn admin-window-action-btn--logout"
                onClick={handleLogout}
              >
                LOGOUT
              </button>
            )}
          </div>
        </header>

        {/* Content Section */}
        <main className="admin-window-content">
          {isLoading ? (
            <div className="admin-window-loading">
              <span className="heist-loading-text">AUTHORIZING COMMAND CONSOLE...</span>
            </div>
          ) : !isAdmin ? (
            /* =================== SCENARIO 1: AUTHORIZATION / LOGIN =================== */
            <div className="admin-window-login-card">
              <div className="admin-window-card-header">
                <span className="admin-window-tag">SECURITY CLEARANCE</span>
                <h1 className="admin-window-title">ADMINISTRATOR AUTHORIZATION</h1>
                <p className="admin-window-subtitle">
                  Authenticate below to access the authoritative event customization & timer command system.
                </p>
              </div>

              <div className="heist-sidebar__banner-notice">
                <span>CLEARANCE VERIFICATION ACTIVE</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('harshil@h.k')
                    setLoginPassword('missionathon@tech')
                    setLoginError('')
                  }}
                  className="heist-login-autofill-btn"
                >
                  AUTO-FILL
                </button>
              </div>

              <form onSubmit={handleLogin} className="heist-admin-form-group">
                <div className="heist-admin-input-wrap">
                  <label className="heist-admin-label" htmlFor="admin-email-input">
                    ADMINISTRATOR EMAIL
                  </label>
                  <input
                    id="admin-email-input"
                    className="heist-admin-text-input"
                    type="email"
                    autoComplete="username"
                    required
                    placeholder="harshil@h.k"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="heist-admin-input-wrap">
                  <label className="heist-admin-label" htmlFor="admin-pass-input">
                    PASSWORD
                  </label>
                  <input
                    id="admin-pass-input"
                    className="heist-admin-text-input"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                {loginError && (
                  <div className="heist-admin-banner heist-admin-banner--error" role="alert">
                    <strong>ACCESS DENIED:</strong> {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="heist-admin-btn heist-admin-btn--start"
                  disabled={isAuthenticating}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  {isAuthenticating ? 'TRANSMITTING CREDENTIALS...' : 'AUTHORIZE & ENTER CONSOLE'}
                </button>
              </form>
            </div>
          ) : (
            /* =================== SCENARIO 2: CUSTOMIZATION & COMMAND CONSOLE =================== */
            <div className="admin-window-dashboard">
              {/* Status Bar */}
              {adminState && (
                <div className="admin-window-status-bar">
                  <div className="admin-window-status-card">
                    <span className="admin-window-status-label">EVENT STATUS</span>
                    <strong className={`heist-status-pill heist-status-pill--${adminState.status}`}>
                      {adminState.status.replace('_', ' ').toUpperCase()}
                    </strong>
                  </div>
                  <div className="admin-window-status-card">
                    <span className="admin-window-status-label">CONNECTED AUDIENCE</span>
                    <strong>{adminState.viewerCount ?? 1} VIEWERS</strong>
                  </div>
                  <div className="admin-window-status-card">
                    <span className="admin-window-status-label">REMAINING COUNTDOWN</span>
                    <strong>
                      {Math.floor(adminState.remainingSeconds / 3600)}h{' '}
                      {Math.floor((adminState.remainingSeconds % 3600) / 60)}m{' '}
                      {adminState.remainingSeconds % 60}s
                    </strong>
                  </div>
                  <div className="admin-window-status-card">
                    <span className="admin-window-status-label">REVEAL STATE</span>
                    <strong>{adminState.status === 'completed' ? 'UNVEILED' : 'SEALED'}</strong>
                  </div>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="admin-window-quick-bar">
                <span className="admin-window-quick-label">IMMEDIATE COMMANDS:</span>
                <div className="admin-window-quick-buttons">
                  {adminState?.status === 'running' && (
                    <button
                      type="button"
                      className="heist-admin-btn heist-admin-btn--pause"
                      onClick={() => handleTimerControl('pause')}
                      disabled={isBusy}
                    >
                      PAUSE COUNTDOWN
                    </button>
                  )}
                  {adminState?.status === 'paused' && (
                    <button
                      type="button"
                      className="heist-admin-btn heist-admin-btn--resume"
                      onClick={() => handleTimerControl('resume')}
                      disabled={isBusy}
                    >
                      RESUME COUNTDOWN
                    </button>
                  )}
                  <button
                    type="button"
                    className="heist-admin-btn heist-admin-btn--reset"
                    onClick={() => handleTimerControl('reset')}
                    disabled={isBusy}
                  >
                    RESET CLOCK
                  </button>
                  <button
                    type="button"
                    className="heist-admin-btn heist-admin-btn--emergency"
                    onClick={() => handleTimerControl('emergency_reveal')}
                    disabled={isBusy}
                  >
                    TRIGGER REVEAL NOW
                  </button>
                  <button
                    type="button"
                    className="heist-admin-btn"
                    onClick={() => handleTimerControl('reseal')}
                    disabled={isBusy}
                  >
                    RE-SEAL ENVELOPE
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="admin-window-tabs">
                <button
                  type="button"
                  className={`admin-window-tab ${activeTab === 'timer' ? 'admin-window-tab--active' : ''}`}
                  onClick={() => setActiveTab('timer')}
                >
                  1. COUNTDOWN & TIMING
                </button>
                <button
                  type="button"
                  className={`admin-window-tab ${activeTab === 'mission' ? 'admin-window-tab--active' : ''}`}
                  onClick={() => setActiveTab('mission')}
                >
                  2. DOSSIER & CARD CUSTOMIZATION
                </button>
                <button
                  type="button"
                  className={`admin-window-tab ${activeTab === 'audit' ? 'admin-window-tab--active' : ''}`}
                  onClick={() => setActiveTab('audit')}
                >
                  3. AUDIT LOGS ({adminState?.auditLogs.length || 0})
                </button>
              </div>

              {statusMessage && (
                <div className="heist-admin-banner heist-admin-banner--success">
                  {statusMessage}
                </div>
              )}
              {errorMessage && (
                <div className="heist-admin-banner heist-admin-banner--error">
                  {errorMessage}
                </div>
              )}

              {/* TAB 1: COUNTDOWN CONFIGURATION */}
              {activeTab === 'timer' && adminState && (
                <div className="admin-window-tab-body">
                  <div className="admin-window-section">
                    <h2 className="admin-window-section-title">CHRONOMETER CONFIGURATION</h2>
                    <p className="admin-window-section-desc">
                      Configure server-authoritative countdown. Visitors synchronize with server time; client-side clock modifications will not alter the countdown.
                    </p>

                    <div className="heist-sidebar__mode-toggle">
                      <button
                        type="button"
                        className={`heist-sidebar__mode-btn ${timerMode === 'duration' ? 'is-active' : ''}`}
                        onClick={() => setTimerMode('duration')}
                      >
                        SET DURATION (HOURS / MINUTES / SECONDS)
                      </button>
                      <button
                        type="button"
                        className={`heist-sidebar__mode-btn ${timerMode === 'target' ? 'is-active' : ''}`}
                        onClick={() => setTimerMode('target')}
                      >
                        SCHEDULE TARGET DATE & TIME
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (timerMode === 'duration') {
                          void handleTimerControl('start', hours, minutes, seconds)
                        } else {
                          void handleTimerControl('set_target', undefined, undefined, undefined, {
                            targetDate,
                            targetTime,
                            timezone,
                          })
                        }
                      }}
                      className="heist-admin-form-group"
                    >
                      {timerMode === 'duration' ? (
                        <>
                          <div className="heist-admin-duration-inputs">
                            <div className="heist-admin-input-wrap">
                              <label className="heist-admin-label">HOURS</label>
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={hours}
                                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                                className="heist-admin-number-input"
                                disabled={adminState.status === 'running'}
                              />
                            </div>
                            <div className="heist-admin-input-wrap">
                              <label className="heist-admin-label">MINUTES</label>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={minutes}
                                onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="heist-admin-number-input"
                                disabled={adminState.status === 'running'}
                              />
                            </div>
                            <div className="heist-admin-input-wrap">
                              <label className="heist-admin-label">SECONDS</label>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={seconds}
                                onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                                className="heist-admin-number-input"
                                disabled={adminState.status === 'running'}
                              />
                            </div>
                          </div>

                          {/* Presets */}
                          <div className="heist-sidebar__presets">
                            <span className="heist-admin-label">FAST PRESETS:</span>
                            <div className="heist-sidebar__presets-btns">
                              <button
                                type="button"
                                className="heist-preset-btn"
                                onClick={() => {
                                  setHours(0); setMinutes(0); setSeconds(10)
                                }}
                                disabled={adminState.status === 'running'}
                              >
                                10 SECONDS (DEMO REVEAL)
                              </button>
                              <button
                                type="button"
                                className="heist-preset-btn"
                                onClick={() => {
                                  setHours(0); setMinutes(15); setSeconds(0)
                                }}
                                disabled={adminState.status === 'running'}
                              >
                                15 MINUTES
                              </button>
                              <button
                                type="button"
                                className="heist-preset-btn"
                                onClick={() => {
                                  setHours(1); setMinutes(0); setSeconds(0)
                                }}
                                disabled={adminState.status === 'running'}
                              >
                                1 HOUR
                              </button>
                              <button
                                type="button"
                                className="heist-preset-btn"
                                onClick={() => {
                                  setHours(12); setMinutes(30); setSeconds(45)
                                }}
                                disabled={adminState.status === 'running'}
                              >
                                12H 30M 45S (DEFAULT)
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="heist-admin-target-inputs">
                          <div className="heist-admin-input-wrap">
                            <label className="heist-admin-label">TARGET CALENDAR DATE</label>
                            <input
                              type="date"
                              value={targetDate}
                              onChange={(e) => setTargetDate(e.target.value)}
                              className="heist-admin-text-input"
                              disabled={adminState.status === 'running'}
                            />
                          </div>

                          <div className="heist-admin-time-inputs">
                            <div className="heist-admin-input-wrap">
                              <label className="heist-admin-label">TARGET TIME (HH:MM)</label>
                              <input
                                type="time"
                                value={targetTime}
                                onChange={(e) => setTargetTime(e.target.value)}
                                className="heist-admin-text-input"
                                disabled={adminState.status === 'running'}
                              />
                            </div>
                            <div className="heist-admin-input-wrap">
                              <label className="heist-admin-label">TIMEZONE</label>
                              <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="heist-admin-text-input"
                                disabled={adminState.status === 'running'}
                              >
                                <option value="UTC">UTC (Universal)</option>
                                <option value="Asia/Kolkata">IST (Asia/Kolkata +05:30)</option>
                                <option value="America/New_York">EST (America/New York)</option>
                                <option value="Europe/Madrid">CET (Europe/Madrid - Spain)</option>
                                <option value="America/Los_Angeles">PST (America/Los Angeles)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="heist-admin-btn heist-admin-btn--start"
                        disabled={isBusy}
                        style={{ marginTop: '12px' }}
                      >
                        {adminState.status === 'running'
                          ? 'RE-APPLY SCHEDULE TO LIVE COUNTDOWN'
                          : 'INITIATE LIVE COUNTDOWN'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: DOSSIER & CARD CUSTOMIZATION */}
              {activeTab === 'mission' && adminState && (
                <div className="admin-window-tab-body">
                  <div className="admin-window-section">
                    <h2 className="admin-window-section-title">CARD & DOSSIER CUSTOMIZATION</h2>
                    <p className="admin-window-section-desc">
                      Upload your confidential challenge card image and brief. The image aspect ratio is preserved with 100% fidelity without cropping or distortion.
                    </p>

                    <form onSubmit={handleSaveMission} className="heist-admin-form-group">
                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">MISSION DOSSIER TITLE</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. OPERATION ROYAL MINT: PHASE ONE"
                          className="heist-admin-text-input"
                        />
                      </div>

                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">CONFIDENTIAL DIRECTIVE BRIEF</label>
                        <textarea
                          rows={3}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Mission objectives revealed upon zero-second envelope emergence..."
                          className="heist-admin-textarea"
                        />
                      </div>

                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">CARD IMAGE ASSET SOURCE</label>
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="/mission-image.jpg or external https:// URL"
                          className="heist-admin-text-input"
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">UPLOAD CARD IMAGE</label>
                        <label className="heist-admin-upload-btn">
                          {isUploading ? 'TRANSMITTING ASSET...' : 'BROWSE & UPLOAD IMAGE'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden-file-input"
                            disabled={isUploading}
                          />
                        </label>
                      </div>

                      {/* IMAGE SIZE HELPER */}
                      {imageDimensions && imageSpecs ? (
                        <div className="heist-admin-image-size-helper">
                          <div className="heist-image-helper-badge">IMAGE SPECIFICATION HELPER</div>
                          <div className="heist-image-helper-row">
                            <span className="heist-image-helper-key">Uploaded image:</span>
                            <span className="heist-image-helper-val">
                              {imageDimensions.width} &times; {imageDimensions.height} px
                            </span>
                          </div>
                          <div className="heist-image-helper-row">
                            <span className="heist-image-helper-key">Aspect ratio:</span>
                            <span className="heist-image-helper-val">{imageSpecs.ratioText}</span>
                          </div>
                          <div className="heist-image-helper-row">
                            <span className="heist-image-helper-key">Recommended card presentation:</span>
                            <span className="heist-image-helper-val">{imageSpecs.recPresentation}</span>
                          </div>
                          <div className="heist-image-helper-note">{imageSpecs.note}</div>
                        </div>
                      ) : (
                        <div className="heist-admin-size-guide">
                          <p><b>Recommended:</b> 1200 &times; 1600 px (3:4 ratio) or 1920 &times; 1080 px (16:9 ratio)</p>
                          <p>Aspect ratio is calculated dynamically upon upload. No cropping.</p>
                        </div>
                      )}

                      {/* Live unclipped preview */}
                      {imageUrl && (
                        <div className="heist-admin-preview-wrap">
                          <span className="heist-admin-preview-label">LIVE CARD PREVIEW:</span>
                          <div className="heist-admin-preview-box">
                            <img
                              src={imageUrl}
                              alt="Current reveal preview"
                              className="heist-admin-preview-img"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="heist-admin-btn heist-admin-btn--save"
                        disabled={isBusy}
                        style={{ marginTop: '12px' }}
                      >
                        SAVE DOSSIER CUSTOMIZATION
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIT LOGS */}
              {activeTab === 'audit' && adminState && (
                <div className="admin-window-tab-body">
                  <div className="admin-window-section">
                    <h2 className="admin-window-section-title">ADMINISTRATIVE AUDIT TRAILS</h2>
                    <p className="admin-window-section-desc">
                      Timestamped cryptographic logs of all administrator actions, timing changes, and configuration updates.
                    </p>

                    <div className="heist-admin-audit-list">
                      {adminState.auditLogs.map((log) => (
                        <div key={log.id} className="heist-admin-audit-row">
                          <div className="heist-admin-audit-meta">
                            <b className="heist-admin-audit-action">{log.action}</b>
                            <span className="heist-admin-audit-time">
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="heist-admin-audit-details">{log.details}</p>
                          <span className="heist-admin-audit-user">{log.adminEmail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
