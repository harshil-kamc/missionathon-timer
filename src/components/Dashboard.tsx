import { useState } from 'react'
import { motion } from 'framer-motion'
import { dashboardConfig } from '../config/dashboardConfig'
import Background from './Background'
import CountdownTimer from './CountdownTimer'
import TwistedEnvelope from './TwistedEnvelope'
import { parseDashboardTime } from '../utils/parseDashboardTime'
import missionathonLogo from '../../WhatsApp Image 2026-10-06 at 10.12.02 PM.jpeg'
import SettingsPanel, { type DashboardSettings } from './SettingsPanel'

const settingsStorageKey = 'missionathon-dashboard-settings'

function getInitialSettings(): DashboardSettings {
  try {
    const savedSettings = window.localStorage.getItem(settingsStorageKey)
    return savedSettings
      ? { ...dashboardConfig, ...JSON.parse(savedSettings) as Partial<DashboardSettings> }
      : dashboardConfig
  } catch {
    return dashboardConfig
  }
}

export default function Dashboard() {
  const [settings, setSettings] = useState(getInitialSettings)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const releaseTime = parseDashboardTime(settings.targetTime)

  const saveSettings = (nextSettings: DashboardSettings) => {
    setSettings(nextSettings)
    try {
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(nextSettings))
    } catch {
      // Keep the updated settings active for this page if storage is unavailable.
    }
    setIsSettingsOpen(false)
  }

  return (
    <main className="dashboard">
      <Background />
      <header className="brand" aria-label="Missionathon">
        <motion.img
          className="brand__logo"
          src={missionathonLogo}
          alt=""
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </header>
      <div className="dashboard__content">
        <CountdownTimer targetTime={releaseTime} />
        <TwistedEnvelope
          releaseTime={releaseTime}
          missionTitle={settings.missionTitle}
          missionText={settings.missionText}
          missionImage={settings.missionImage}
        />
      </div>
      <button
        className="settings-toggle"
        type="button"
        aria-label={isSettingsOpen ? 'Close mission settings' : 'Open mission settings'}
        aria-expanded={isSettingsOpen}
        aria-controls="mission-settings-panel"
        onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
      >
        <span aria-hidden="true">&#9881;</span>
      </button>
      {isSettingsOpen && (
        <SettingsPanel
          initialSettings={settings}
          onSave={saveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </main>
  )
}
