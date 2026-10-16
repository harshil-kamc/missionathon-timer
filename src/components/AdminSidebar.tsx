import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import type { AdminState } from './SettingsPanel'

type AdminSidebarProps = {
  isOpen: boolean
  isAdmin: boolean
  adminState: AdminState | null
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onLogout: () => Promise<void>
  onTimerControl: (
    action: string,
    hours?: number,
    minutes?: number,
    seconds?: number,
    extra?: Record<string, any>
  ) => Promise<void>
  onSaveMissionContent: (content: {
    title: string
    text: string
    image: string
    revealType: 'image' | 'text' | 'both'
  }) => Promise<void>
  onUploadImage: (base64Data: string, filename: string) => Promise<void>
}

// Helper: Greatest common divisor
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// Calculate simplified aspect ratio and recommended dimensions
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

  const d = gcd(width, height)
  const wr = Math.round(width / d)
  const hr = Math.round(height / d)

  let ratioName = `${wr}:${hr}`
  if (wr > 30 || hr > 30) {
    ratioName = `${floatRatio.toFixed(2)}:1`
  }

  const recW = width >= height ? 1920 : Math.round(1600 * floatRatio)
  const recH = width >= height ? Math.round(1920 / floatRatio) : 1600

  return {
    ratioText: ratioName,
    recPresentation: ratioName,
    note: `Prepare artwork at approximately ${recW} × ${recH} px for this card ratio.`,
  }
}

export default function AdminSidebar({
  isOpen,
  isAdmin,
  adminState,
  onClose,
  onLogin,
  onLogout,
  onTimerControl,
  onSaveMissionContent,
  onUploadImage,
}: AdminSidebarProps) {
  // Login credentials
  const [loginEmail, setLoginEmail] = useState('harshil@h.k')
  const [loginPassword, setLoginPassword] = useState('missionathon@tech')
  const [loginError, setLoginError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Timer controls
  const currentDuration = adminState?.durationSeconds ?? 45045
  const initialHours = Math.floor(currentDuration / 3600)
  const initialMinutes = Math.floor((currentDuration % 3600) / 60)
  const initialSeconds = currentDuration % 60

  const [hours, setHours] = useState(initialHours)
  const [minutes, setMinutes] = useState(initialMinutes)
  const [seconds, setSeconds] = useState(initialSeconds)

  // Target Date, Time, and Timezone state (Section 5)
  const [targetDate, setTargetDate] = useState(
    adminState?.targetDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  )
  const [targetTime, setTargetTime] = useState(
    adminState?.targetTime || '18:00'
  )
  const [timezone, setTimezone] = useState(adminState?.timezone || 'UTC')
  const [timerMode, setTimerMode] = useState<'duration' | 'target'>('duration')

  // Mission content
  const [title, setTitle] = useState(adminState?.mission?.title || '')
  const [text, setText] = useState(adminState?.mission?.text || '')
  const [imageUrl, setImageUrl] = useState(adminState?.mission?.image || '')
  const [revealType, setRevealType] = useState<'image' | 'text' | 'both'>(
    adminState?.mission?.revealType || 'image'
  )

  // Image Helper specs (Section 9)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  const [activeTab, setActiveTab] = useState<'timer' | 'mission' | 'audit'>('timer')
  const [isBusy, setIsBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Read actual image dimensions whenever imageUrl changes
  useEffect(() => {
    if (!imageUrl) {
      setImageDimensions(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = imageUrl
  }, [imageUrl])

  // Sync inputs when adminState updates
  useEffect(() => {
    if (adminState) {
      const h = Math.floor(adminState.durationSeconds / 3600)
      const m = Math.floor((adminState.durationSeconds % 3600) / 60)
      const s = adminState.durationSeconds % 60
      setHours(h)
      setMinutes(m)
      setSeconds(s)
      if (adminState.targetDate) setTargetDate(adminState.targetDate)
      if (adminState.targetTime) setTargetTime(adminState.targetTime.slice(0, 5))
      if (adminState.timezone) setTimezone(adminState.timezone)
      setTitle(adminState.mission.title)
      setText(adminState.mission.text)
      setImageUrl(adminState.mission.image)
      setRevealType(adminState.mission.revealType || 'image')
    }
  }, [adminState])

  const showSuccess = (msg: string) => {
    setStatusMessage(msg)
    setErrorMessage('')
    window.setTimeout(() => setStatusMessage(''), 4000)
  }

  const showError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    setErrorMessage(msg)
    setStatusMessage('')
  }

  const handleLoginFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsAuthenticating(true)
    try {
      await onLogin(loginEmail.trim(), loginPassword.trim())
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials. Access denied.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleFillDemo = () => {
    setLoginEmail('harshil@h.k')
    setLoginPassword('missionathon@tech')
    setLoginError('')
  }

  const handleStartTimer = async (e: FormEvent) => {
    e.preventDefault()
    setIsBusy(true)
    try {
      if (timerMode === 'duration') {
        await onTimerControl('start', hours, minutes, seconds)
        showSuccess(`Countdown initiated: ${hours}h ${minutes}m ${seconds}s`)
      } else {
        await onTimerControl('set_target', undefined, undefined, undefined, {
          targetDate,
          targetTime,
          timezone,
        })
        showSuccess(`Target schedule saved: ${targetDate} ${targetTime} (${timezone})`)
      }
    } catch (err) {
      showError(err)
    } finally {
      setIsBusy(false)
    }
  }

  const handleAction = async (action: string) => {
    setIsBusy(true)
    try {
      await onTimerControl(action)
      if (action === 'pause') showSuccess('Countdown suspended')
      if (action === 'resume') showSuccess('Countdown resumed')
      if (action === 'reset') showSuccess('Event reset to initial state')
      if (action === 'emergency_reveal') showSuccess('Direct emergency reveal activated')
      if (action === 'reseal') showSuccess('Dossier returned to sealed envelope state')
    } catch (err) {
      showError(err)
    } finally {
      setIsBusy(false)
    }
  }

  const handleSaveMission = async (e: FormEvent) => {
    e.preventDefault()
    setIsBusy(true)
    try {
      await onSaveMissionContent({
        title: title.trim(),
        text: text.trim(),
        image: imageUrl.trim(),
        revealType,
      })
      showSuccess('Reveal parameters updated authoritatively.')
    } catch (err) {
      showError(err)
    } finally {
      setIsBusy(false)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      showError('File exceeds 8MB limit. Please provide a lighter image.')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = reader.result as string
      // Pre-measure dimensions
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.src = base64Data

      setIsBusy(true)
      try {
        await onUploadImage(base64Data, file.name)
        setImageUrl(base64Data)
        showSuccess(`Uploaded ${file.name} successfully`)
      } catch (err) {
        showError(err)
      } finally {
        setIsBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const imageSpecs = imageDimensions
    ? calculateImageSpecs(imageDimensions.width, imageDimensions.height)
    : null

  return (
    <aside
      className={`heist-standalone-sidebar ${isOpen ? 'is-open' : 'is-collapsed'}`}
      aria-label="Administrator Command Panel"
    >
      <div className="heist-sidebar__inner">
        {/* Header Bar */}
        <div className="heist-sidebar__header">
          <div className="heist-sidebar__title-wrap">
            <span className="heist-sidebar__bullet">&#9670;</span>
            <h2 className="heist-sidebar__title">
              {isAdmin ? 'CENTRAL COMMAND CONSOLE' : 'ACCESS CONTROL'}
            </h2>
          </div>

          <div className="heist-sidebar__header-actions">
            <button
              type="button"
              className="heist-sidebar__window-link"
              onClick={() => {
                const url = window.location.origin + '/admin'
                window.open(url, 'MissionathonAdminWindow', 'width=1100,height=800,resizable=yes,scrollbars=yes')
              }}
              title="Open Authorization & Customization in Separate Popout Window"
            >
              &#x29C9; POP OUT
            </button>
            <a
              href="/admin"
              className="heist-sidebar__window-link"
              target="_blank"
              rel="noopener noreferrer"
              title="Open /admin URL directory in new tab"
            >
              &#x2197; /ADMIN
            </a>
            {isAdmin && (
              <button
                type="button"
                className="heist-sidebar__logout-link"
                onClick={onLogout}
                title="End administrator session"
              >
                LOGOUT
              </button>
            )}
            <button
              type="button"
              className="heist-sidebar__close-btn"
              onClick={onClose}
              title="Collapse admin sidebar"
              aria-label="Collapse admin sidebar"
            >
              &#10005;
            </button>
          </div>
        </div>

        {/* SCENARIO 1: UNAUTHENTICATED -> Inline Admin Login Form */}
        {!isAdmin && (
          <div className="heist-sidebar__login-pane">
            <div className="heist-sidebar__banner-notice">
              <span>ADMINISTRATIVE CLEARANCE REQUIRED</span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="heist-login-autofill-btn"
              >
                AUTO-FILL
              </button>
            </div>

            <form onSubmit={handleLoginFormSubmit} className="heist-admin-form-group">
              <div className="heist-admin-input-wrap">
                <label className="heist-admin-label" htmlFor="sidebar-email-input">
                  ADMIN EMAIL
                </label>
                <input
                  id="sidebar-email-input"
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
                <label className="heist-admin-label" htmlFor="sidebar-pass-input">
                  PASSWORD
                </label>
                <input
                  id="sidebar-pass-input"
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
                {isAuthenticating
                  ? 'TRANSMITTING CREDENTIALS...'
                  : 'ENTER MISSION CONTROL'}
              </button>
            </form>
          </div>
        )}

        {/* SCENARIO 2: AUTHENTICATED -> Live Command Console with Tabs */}
        {isAdmin && adminState && (
          <div className="heist-sidebar__console-pane">
            {/* Live Status Pill Bar */}
            <div className="heist-admin-status-bar">
              <div className="heist-admin-status-item">
                <span>EVENT STATE</span>
                <b className={`heist-status-pill heist-status-pill--${adminState.status}`}>
                  {adminState.status.replace('_', ' ').toUpperCase()}
                </b>
              </div>
              <div className="heist-admin-status-item">
                <span>VIEWERS</span>
                <b>{adminState.viewerCount ?? 1} CONNECTED</b>
              </div>
              <div className="heist-admin-status-item">
                <span>REMAINING</span>
                <b>
                  {Math.floor(adminState.remainingSeconds / 60)}m {adminState.remainingSeconds % 60}s
                </b>
              </div>
            </div>

            {/* Quick Live Actions Toolbar */}
            <div className="heist-sidebar__quick-actions">
              {adminState.status === 'running' && (
                <button
                  type="button"
                  className="heist-admin-btn heist-admin-btn--pause"
                  onClick={() => handleAction('pause')}
                  disabled={isBusy}
                >
                  PAUSE TIMER
                </button>
              )}
              {adminState.status === 'paused' && (
                <button
                  type="button"
                  className="heist-admin-btn heist-admin-btn--resume"
                  onClick={() => handleAction('resume')}
                  disabled={isBusy}
                >
                  RESUME TIMER
                </button>
              )}
              <button
                type="button"
                className="heist-admin-btn heist-admin-btn--reset"
                onClick={() => handleAction('reset')}
                disabled={isBusy}
              >
                RESET
              </button>
            </div>

            {/* Tab navigation */}
            <div className="heist-admin-tabs">
              <button
                type="button"
                className={`heist-admin-tab${activeTab === 'timer' ? ' heist-admin-tab--active' : ''}`}
                onClick={() => setActiveTab('timer')}
              >
                TIMER
              </button>
              <button
                type="button"
                className={`heist-admin-tab${activeTab === 'mission' ? ' heist-admin-tab--active' : ''}`}
                onClick={() => setActiveTab('mission')}
              >
                DOSSIER
              </button>
              <button
                type="button"
                className={`heist-admin-tab${activeTab === 'audit' ? ' heist-admin-tab--active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                AUDIT ({adminState.auditLogs.length})
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

            {/* TAB 1: TIMER CONFIGURATION */}
            {activeTab === 'timer' && (
              <div className="heist-admin-tab-body">
                {/* Mode Selector: Duration vs Target Date & Time */}
                <div className="heist-sidebar__mode-toggle">
                  <button
                    type="button"
                    className={`heist-sidebar__mode-btn ${timerMode === 'duration' ? 'is-active' : ''}`}
                    onClick={() => setTimerMode('duration')}
                  >
                    DURATION COUNTDOWN
                  </button>
                  <button
                    type="button"
                    className={`heist-sidebar__mode-btn ${timerMode === 'target' ? 'is-active' : ''}`}
                    onClick={() => setTimerMode('target')}
                  >
                    TARGET DATE & TIME
                  </button>
                </div>

                <form onSubmit={handleStartTimer} className="heist-admin-form-group">
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
                      <div className="heist-sidebar__presets-wrap">
                        <span className="heist-admin-label">QUICK PRESETS:</span>
                        <div className="heist-sidebar__presets-btns">
                          <button
                            type="button"
                            className="heist-preset-btn"
                            onClick={() => {
                              setHours(0)
                              setMinutes(15)
                              setSeconds(0)
                            }}
                            disabled={adminState.status === 'running'}
                          >
                            15 MIN
                          </button>
                          <button
                            type="button"
                            className="heist-preset-btn"
                            onClick={() => {
                              setHours(0)
                              setMinutes(30)
                              setSeconds(0)
                            }}
                            disabled={adminState.status === 'running'}
                          >
                            30 MIN
                          </button>
                          <button
                            type="button"
                            className="heist-preset-btn"
                            onClick={() => {
                              setHours(1)
                              setMinutes(0)
                              setSeconds(0)
                            }}
                            disabled={adminState.status === 'running'}
                          >
                            1 HOUR
                          </button>
                          <button
                            type="button"
                            className="heist-preset-btn"
                            onClick={() => {
                              setHours(12)
                              setMinutes(30)
                              setSeconds(45)
                            }}
                            disabled={adminState.status === 'running'}
                          >
                            DEFAULT (12h 30m)
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Target Date, Time & Timezone Inputs */
                    <div className="heist-admin-target-inputs">
                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">TARGET DATE (YYYY-MM-DD)</label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="heist-admin-text-input"
                          disabled={adminState.status === 'running'}
                          required
                        />
                      </div>
                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">TARGET TIME (HH:MM)</label>
                        <input
                          type="time"
                          value={targetTime}
                          onChange={(e) => setTargetTime(e.target.value)}
                          className="heist-admin-text-input"
                          disabled={adminState.status === 'running'}
                          required
                        />
                      </div>
                      <div className="heist-admin-input-wrap">
                        <label className="heist-admin-label">AUTHORITATIVE TIMEZONE</label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="heist-admin-text-input"
                          disabled={adminState.status === 'running'}
                        >
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="Asia/Kolkata">IST / Asia/Kolkata (UTC+5:30)</option>
                          <option value="Europe/Madrid">CET / Europe/Madrid (UTC+1:00)</option>
                          <option value="Europe/London">GMT / Europe/London (UTC+0:00)</option>
                          <option value="America/New_York">EST / America/New_York (UTC-5:00)</option>
                          <option value="America/Los_Angeles">PST / America/Los_Angeles (UTC-8:00)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="heist-admin-btn heist-admin-btn--start"
                    disabled={isBusy || adminState.status === 'running'}
                  >
                    {adminState.status === 'running'
                      ? 'TIMER IS CURRENTLY TICKING'
                      : timerMode === 'duration'
                      ? 'START OFFICIAL COUNTDOWN'
                      : 'SCHEDULE TARGET COUNTDOWN'}
                  </button>
                </form>

                {/* Emergency Reveal Section */}
                <div className="heist-admin-emergency-section">
                  <span className="heist-admin-label">EMERGENCY OVERRIDE CONTROLS</span>
                  <div className="heist-admin-emergency-actions">
                    <button
                      type="button"
                      className="heist-admin-btn heist-admin-btn--emergency"
                      onClick={() => handleAction('emergency_reveal')}
                      disabled={isBusy || adminState.status === 'completed'}
                    >
                      TRIGGER EMERGENCY REVEAL NOW
                    </button>

                    <button
                      type="button"
                      className="heist-admin-btn heist-admin-btn--reseal"
                      onClick={() => handleAction('reseal')}
                      disabled={isBusy || adminState.status !== 'completed'}
                    >
                      RE-SEAL ENVELOPE
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DOSSIER CONTENT */}
            {activeTab === 'mission' && (
              <div className="heist-admin-tab-body">
                <form onSubmit={handleSaveMission} className="heist-admin-form-group">
                  <label className="heist-admin-label">MISSION TITLE</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. OPERATION ROYAL MINT - OBJECTIVE 01"
                    className="heist-admin-text-input"
                  />

                  <label className="heist-admin-label">CUSTOM BRIEFING DIRECTIVES (TEXT)</label>
                  <textarea
                    rows={3}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter briefing instructions, cryptographic keys, or mission guidance..."
                    className="heist-admin-textarea"
                  />

                  <label className="heist-admin-label">REVEAL FORMAT</label>
                  <div className="heist-admin-format-radios">
                    <label>
                      <input
                        type="radio"
                        name="sidebarRevealType"
                        value="image"
                        checked={revealType === 'image'}
                        onChange={() => setRevealType('image')}
                      />
                      <span>Image Only</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sidebarRevealType"
                        value="text"
                        checked={revealType === 'text'}
                        onChange={() => setRevealType('text')}
                      />
                      <span>Text Only</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sidebarRevealType"
                        value="both"
                        checked={revealType === 'both'}
                        onChange={() => setRevealType('both')}
                      />
                      <span>Both Image & Text</span>
                    </label>
                  </div>

                  <label className="heist-admin-label">MISSION IMAGE SOURCE (URL OR FILE)</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="/mission-image.jpg or https://..."
                    className="heist-admin-text-input"
                  />

                  <div className="heist-admin-file-upload-row">
                    <label className="heist-admin-upload-btn">
                      <span>UPLOAD IMAGE FILE (MAX 8MB)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="hidden-file-input"
                      />
                    </label>
                  </div>

                  {/* SECTION 9: IMAGE SIZE HELPER */}
                  {imageDimensions && imageSpecs ? (
                    <div className="heist-admin-image-size-helper">
                      <div className="heist-image-helper-badge">IMAGE SIZE HELPER</div>
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
                      <div className="heist-image-helper-note">
                        &ldquo;{imageSpecs.note}&rdquo;
                      </div>
                    </div>
                  ) : (
                    <div className="heist-admin-size-guide">
                      <p><b>Recommended:</b> 1200 &times; 1600 px (3:4 ratio) or 1920 &times; 1080 px (16:9 ratio)</p>
                      <p>Aspect ratio is calculated dynamically upon upload. No cropping.</p>
                    </div>
                  )}

                  {imageUrl && (
                    <div className="heist-admin-preview-wrap">
                      <span className="heist-admin-preview-label">LIVE UNCLIPPED PREVIEW:</span>
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
                  >
                    SAVE REVEAL PARAMETERS
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div className="heist-admin-tab-body">
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
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
