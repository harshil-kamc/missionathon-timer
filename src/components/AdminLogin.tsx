import { useState, useEffect, type FormEvent } from 'react'

type AdminLoginProps = {
  onLogin: (email: string, password: string) => Promise<void>
  onClose: () => void
}

export default function AdminLogin({ onLogin, onClose }: AdminLoginProps) {
  const [email, setEmail] = useState('h@harshil@h.k')
  const [password, setPassword] = useState('missionathon@tech')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onLogin(email.trim(), password.trim())
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in. Verify credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFillDemo = () => {
    setEmail('harshil@h.k')
    setPassword('missionathon@tech')
    setError('')
  }

  return (
    <div className="heist-login-backdrop" onClick={onClose}>
      <aside
        className="heist-login-dialog"
        id="mission-settings-panel"
        aria-labelledby="admin-login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="heist-admin-drawer__header">
          <div>
            <span className="heist-admin-drawer__kicker">MISSIONATHON RESTRICTED ACCESS</span>
            <h2 id="admin-login-title">ADMIN SIGN IN</h2>
          </div>
          <button
            className="heist-admin-drawer__close"
            type="button"
            aria-label="Close admin sign in"
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="heist-login-key-banner">
          <div className="heist-login-key-info">
            <span className="heist-login-key-label">DEFAULT CREDENTIALS</span>
            <code className="heist-login-key-code">harshil@h.k / missionathon@tech</code>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="heist-login-autofill-btn"
          >
            AUTO-FILL
          </button>
        </div>

        <form className="heist-admin-form-group" onSubmit={(event) => void handleSubmit(event)}>
          <div className="heist-admin-input-wrap">
            <label className="heist-admin-label" htmlFor="admin-email-input">
              ADMIN EMAIL
            </label>
            <input
              id="admin-email-input"
              className="heist-admin-text-input"
              type="email"
              autoComplete="username"
              required
              placeholder="authorized admin email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              placeholder=""
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <div className="heist-admin-banner heist-admin-banner--error" role="alert">
              <strong>AUTHENTICATION REJECTED:</strong> {error}
            </div>
          )}

          <button
            className="heist-admin-btn heist-admin-btn--start"
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '6px' }}
          >
            {isSubmitting ? 'AUTHENTICATING TRANSMISSION...' : 'AUTHENTICATE & ENTER MISSION CONTROL'}
          </button>
        </form>
      </aside>
    </div>
  )
}
