import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type CountdownTimerProps = {
  status: 'not_started' | 'running' | 'paused' | 'completed'
  targetEndTime: number | null
  remainingSeconds: number
  serverTimeOffset: number
  onZeroReached?: () => void
}

type TimeParts = {
  hours: string
  minutes: string
  seconds: string
  totalRemaining: number
}

function computeTimeParts(
  status: string,
  targetEndTime: number | null,
  remainingSeconds: number,
  serverTimeOffset: number
): TimeParts {
  if (status === 'completed') {
    return { hours: '00', minutes: '00', seconds: '00', totalRemaining: 0 }
  }

  let total = remainingSeconds
  if (status === 'running' && targetEndTime) {
    const currentServerTime = Date.now() + serverTimeOffset
    total = Math.max(0, Math.floor((targetEndTime - currentServerTime) / 1000))
  }

  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  return {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
    totalRemaining: total,
  }
}

export default function CountdownTimer({
  status,
  targetEndTime,
  remainingSeconds,
  serverTimeOffset,
  onZeroReached,
}: CountdownTimerProps) {
  const [time, setTime] = useState(() =>
    computeTimeParts(status, targetEndTime, remainingSeconds, serverTimeOffset)
  )

  useEffect(() => {
    let animationFrameId: number
    let lastSecond = -1

    const tick = () => {
      const parts = computeTimeParts(status, targetEndTime, remainingSeconds, serverTimeOffset)
      
      if (parts.totalRemaining !== lastSecond) {
        lastSecond = parts.totalRemaining
        setTime(parts)
        if (parts.totalRemaining === 0 && status === 'running' && onZeroReached) {
          onZeroReached()
        }
      }

      if (status === 'running') {
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    tick()

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [status, targetEndTime, remainingSeconds, serverTimeOffset, onZeroReached])

  const isComplete = status === 'completed' || time.totalRemaining === 0

  return (
    <motion.div
      className={`countdown-container${isComplete ? ' countdown-container--complete' : ''}${status === 'paused' ? ' countdown-container--paused' : ''}`}
      role="timer"
      aria-label={`${time.hours} hours, ${time.minutes} minutes, ${time.seconds} seconds remaining`}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Hours Group */}
      <div className="countdown__digit-group">
        <span className="countdown__digits">{time.hours}</span>
        <span className="countdown__label">HR</span>
      </div>

      {/* Minutes Group */}
      <div className="countdown__digit-group">
        <span className="countdown__digits">{time.minutes}</span>
        <span className="countdown__label">MIN</span>
      </div>

      {/* Seconds Group */}
      <div className="countdown__digit-group">
        <span className="countdown__digits">{time.seconds}</span>
        <span className="countdown__label">SEC</span>
      </div>
    </motion.div>
  )
}
