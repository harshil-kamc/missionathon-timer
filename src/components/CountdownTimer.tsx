import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type CountdownTimerProps = {
  targetTime: number
}

type TimeParts = {
  minutes: string
  seconds: string
  milliseconds: string
  complete: boolean
}

function getTimeParts(targetTime: number): TimeParts {
  const remaining = Math.max(0, targetTime - Date.now())
  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const milliseconds = Math.floor(remaining % 1000)

  return {
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    milliseconds: String(milliseconds).padStart(3, '0'),
    complete: remaining === 0,
  }
}

export default function CountdownTimer({ targetTime }: CountdownTimerProps) {
  const [time, setTime] = useState(() => getTimeParts(targetTime))

  useEffect(() => {
    const update = () => {
      setTime(getTimeParts(targetTime))
    }

    const interval = window.setInterval(update, 200)
    return () => window.clearInterval(interval)
  }, [targetTime])

  return (
    <motion.div
      className={`countdown${time.complete ? ' countdown--complete' : ''}`}
      role="timer"
      aria-label={`${time.minutes} minutes, ${time.seconds} seconds, ${time.milliseconds} milliseconds remaining`}
      initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <span>{time.minutes}</span><i>:</i><span>{time.seconds}</span><i>:</i>
      <span className="countdown__milliseconds">{time.milliseconds}</span>
    </motion.div>
  )
}
