import { useState, type FormEvent } from 'react'

export type DashboardSettings = {
  targetTime: string
  missionTitle: string
  missionText: string
  missionImage: string
}

type SettingsPanelProps = {
  initialSettings: DashboardSettings
  onSave: (settings: DashboardSettings) => void
  onClose: () => void
}

export default function SettingsPanel({ initialSettings, onSave, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [error, setError] = useState('')

  const updateField = (field: keyof DashboardSettings, value: string) => {
    setSettings((currentSettings) => ({ ...currentSettings, [field]: value }))
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetTime = settings.targetTime.trim()
    const missionImage = settings.missionImage.trim()

    if (!targetTime || Number.isNaN(new Date(`${targetTime}+05:30`).getTime())) {
      setError('Enter a valid target date and time in IST.')
      return
    }

    if (missionImage && !(/^(https?:\/\/|\/)/i.test(missionImage))) {
      setError('Use a full image URL or a public path starting with /.')
      return
    }

    onSave({ ...settings, targetTime, missionImage })
  }

  return (
    <aside className="settings-panel" id="mission-settings-panel" aria-labelledby="settings-title">
      <div className="settings-panel__header">
        <div>
          <p className="settings-panel__eyebrow">MISSIONATHON // CONTROL</p>
          <h2 id="settings-title">MISSION SETTINGS</h2>
        </div>
        <button className="settings-panel__close" type="button" aria-label="Close settings" onClick={onClose}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="settings-form__field">
          <span>Target date and time <b>IST</b></span>
          <input
            type="datetime-local"
            step="1"
            required
            value={settings.targetTime}
            onChange={(event) => updateField('targetTime', event.target.value)}
          />
        </label>
        <label className="settings-form__field">
          <span>Mission title</span>
          <input
            type="text"
            value={settings.missionTitle}
            onChange={(event) => updateField('missionTitle', event.target.value)}
            placeholder="Mission title"
          />
        </label>
        <label className="settings-form__field">
          <span>Mission text</span>
          <textarea
            rows={3}
            value={settings.missionText}
            onChange={(event) => updateField('missionText', event.target.value)}
            placeholder="Briefing text"
          />
        </label>
        <label className="settings-form__field">
          <span>Mission image URL or public path</span>
          <input
            type="text"
            inputMode="url"
            value={settings.missionImage}
            onChange={(event) => updateField('missionImage', event.target.value)}
            placeholder="https://... or /image.jpg"
          />
        </label>
        {error && <p className="settings-form__error" role="alert">{error}</p>}
        <button className="settings-form__save" type="submit">SAVE MISSION SETTINGS</button>
      </form>
    </aside>
  )
}