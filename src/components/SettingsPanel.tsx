import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'

export type AdminState = {
  status: 'not_started' | 'running' | 'paused' | 'completed'
  targetDate?: string
  targetTime?: string
  timezone?: string
  durationSeconds: number
  remainingSeconds: number
  targetEndTime: number | null
  startedAt: number | null
  pausedAt: number | null
  serverTime: number
  viewerCount?: number
  mission: {
    title: string
    text: string
    image: string
    revealType: 'image' | 'text' | 'both'
  }
  auditLogs: Array<{
    id: string
    action: string
    details: string
    timestamp: string
    adminEmail: string
  }>
}

type SettingsPanelProps = {
  adminState: AdminState
  onTimerControl: (action: string, hours?: number, minutes?: number, seconds?: number) => Promise<void>
  onSaveMissionContent: (content: { title: string; text: string; image: string; revealType: 'image' | 'text' | 'both' }) => Promise<void>
  onUploadImage: (base64Data: string, filename: string) => Promise<void>
  onLogout: () => Promise<void>
  onClose: () => void
}

export default function SettingsPanel({
  adminState,
  onTimerControl,
  onSaveMissionContent,
  onUploadImage,
  onLogout,
  onClose,
}: SettingsPanelProps) {
  // Timer inputs
  const initialHours = Math.floor(adminState.durationSeconds / 3600)
  const initialMinutes = Math.floor((adminState.durationSeconds % 3600) / 60)
  const initialSeconds = adminState.durationSeconds % 60

  const [hours, setHours] = useState(initialHours)
  const [minutes, setMinutes] = useState(initialMinutes)
  const [seconds, setSeconds] = useState(initialSeconds)

  // Mission inputs
  const [title, setTitle] = useState(adminState.mission.title)
  const [text, setText] = useState(adminState.mission.text)
  const [imageUrl, setImageUrl] = useState(adminState.mission.image)
  const [revealType, setRevealType] = useState<'image' | 'text' | 'both'>(adminState.mission.revealType || 'both')

  const [activeTab, setActiveTab] = useState<'timer' | 'mission' | 'audit'>('timer')
  const [isBusy, setIsBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setTitle(adminState.mission.title)
    setText(adminState.mission.text)
    setImageUrl(adminState.mission.image)
    setRevealType(adminState.mission.revealType || 'both')
  }, [adminState.mission])

  const showSuccess = (msg: string) => {
    setStatusMessage(msg)
    setErrorMessage('')
    setTimeout(() => setStatusMessage(''), 3000)
  }

  const showError = (err: unknown) => {
    setErrorMessage(err instanceof Error ? err.message : 'Operation failed')
    setTimeout(() => setErrorMessage(''), 5000)
  }

  const handleStartTimer = async (e: FormEvent) => {
    e.preventDefault()
    setIsBusy(true)
    try {
      await onTimerControl('start', Number(hours), Number(minutes), Number(seconds))
      showSuccess('Countdown started successfully on server')
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
      showSuccess(`Action executed: ${action.toUpperCase()}`)
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
      await onSaveMissionContent({ title, text, image: imageUrl, revealType })
      showSuccess('Mission reveal directives saved and synchronized')
    } catch (err) {
      showError(err)
    } finally {
      setIsBusy(false)
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image exceeds 8MB maximum limit.')
      return
    }

    setIsBusy(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const base64 = evt.target?.result as string
        await onUploadImage(base64, file.name)
        showSuccess('New mission image uploaded & set as reveal target')
      } catch (err) {
        showError(err)
      } finally {
        setIsBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="heist-admin-drawer" aria-labelledby="heist-admin-title">
      {/* Header */}
      <div className="heist-admin-drawer__header">
        <div>
          <span className="heist-admin-drawer__kicker">MISSIONATHON MISSION CONTROL</span>
          <h2 id="heist-admin-title">COMMAND CONSOLE</h2>
        </div>
        <div className="heist-admin-drawer__head-actions">
          <button
            type="button"
            className="heist-admin-btn heist-admin-btn--logout"
            onClick={onLogout}
            disabled={isBusy}
          >
            LOGOUT
          </button>
          <button
            type="button"
            className="heist-admin-drawer__close"
            onClick={onClose}
            aria-label="Close admin console"
          >
            &times;
          </button>
        </div>
      </div>

      {/* State banner */}
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
          <b>{Math.floor(adminState.remainingSeconds / 60)}m {adminState.remainingSeconds % 60}s</b>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="heist-admin-tabs">
        <button
          type="button"
          className={`heist-admin-tab${activeTab === 'timer' ? ' heist-admin-tab--active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          TIMER CONTROLS
        </button>
        <button
          type="button"
          className={`heist-admin-tab${activeTab === 'mission' ? ' heist-admin-tab--active' : ''}`}
          onClick={() => setActiveTab('mission')}
        >
          REVEAL CONTENT
        </button>
        <button
          type="button"
          className={`heist-admin-tab${activeTab === 'audit' ? ' heist-admin-tab--active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          AUDIT LOGS ({adminState.auditLogs.length})
        </button>
      </div>

      {statusMessage && <div className="heist-admin-banner heist-admin-banner--success">{statusMessage}</div>}
      {errorMessage && <div className="heist-admin-banner heist-admin-banner--error">{errorMessage}</div>}

      {/* TAB 1: TIMER CONTROLS */}
      {activeTab === 'timer' && (
        <div className="heist-admin-tab-body">
          <form onSubmit={handleStartTimer} className="heist-admin-form-group">
            <label className="heist-admin-label">AUTHORITATIVE COUNTDOWN DURATION</label>
            <div className="heist-admin-time-inputs">
              <div className="heist-admin-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={adminState.status === 'running'}
                  required
                />
                <span>HOURS</span>
              </div>
              <div className="heist-admin-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  disabled={adminState.status === 'running'}
                  required
                />
                <span>MINUTES</span>
              </div>
              <div className="heist-admin-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  disabled={adminState.status === 'running'}
                  required
                />
                <span>SECONDS</span>
              </div>
            </div>

            <button
              type="submit"
              className="heist-admin-btn heist-admin-btn--start"
              disabled={isBusy || adminState.status === 'running'}
            >
              {adminState.status === 'running' ? 'TIMER IS CURRENTLY RUNNING' : 'START OFFICIAL COUNTDOWN'}
            </button>
          </form>

          {/* Action Row */}
          <div className="heist-admin-action-grid">
            {adminState.status === 'running' && (
              <button
                type="button"
                className="heist-admin-btn heist-admin-btn--pause"
                onClick={() => handleAction('pause')}
                disabled={isBusy}
              >
                PAUSE COUNTDOWN
              </button>
            )}

            {adminState.status === 'paused' && (
              <button
                type="button"
                className="heist-admin-btn heist-admin-btn--resume"
                onClick={() => handleAction('resume')}
                disabled={isBusy}
              >
                RESUME COUNTDOWN
              </button>
            )}

            <button
              type="button"
              className="heist-admin-btn heist-admin-btn--reset"
              onClick={() => handleAction('reset')}
              disabled={isBusy}
            >
              RESET TO NOT STARTED
            </button>
          </div>

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
                RE-SEAL ENVELOPE (RETURN TO SEALED)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVEAL CONTENT */}
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
                  name="revealType"
                  value="image"
                  checked={revealType === 'image'}
                  onChange={() => setRevealType('image')}
                />
                <span>Image Only</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="revealType"
                  value="text"
                  checked={revealType === 'text'}
                  onChange={() => setRevealType('text')}
                />
                <span>Text Only</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="revealType"
                  value="both"
                  checked={revealType === 'both'}
                  onChange={() => setRevealType('both')}
                />
                <span>Both Image & Text</span>
              </label>
            </div>

            {/* Image upload and size guide */}
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

            {/* MANDATORY SIZE GUIDE HELPER NOTE */}
            <div className="heist-admin-size-guide">
              <p><b>Recommended image:</b> 1920 &times; 1080 px (16:9 ratio)</p>
              <p>Your image will be displayed without cropping. Keep important content inside the safe area.</p>
            </div>

            {/* Image preview ensuring aspect ratio preservation */}
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
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="heist-admin-audit-details">{log.details}</p>
                <span className="heist-admin-audit-user">{log.adminEmail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
