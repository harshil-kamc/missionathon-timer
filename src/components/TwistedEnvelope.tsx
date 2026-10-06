import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import HintCard from './HintCard'

type TwistedEnvelopeProps = {
  releaseTime: number
  missionTitle: string
  missionText: string
  missionImage: string
}

export default function TwistedEnvelope({ releaseTime, missionTitle, missionText, missionImage }: TwistedEnvelopeProps) {
  const [isReleased, setIsReleased] = useState(() => Date.now() >= releaseTime)

  useEffect(() => {
    const checkRelease = () => setIsReleased(Date.now() >= releaseTime)
    checkRelease()
    const interval = window.setInterval(checkRelease, 1000)
    return () => window.clearInterval(interval)
  }, [releaseTime])

  return (
    <motion.section
      className={`envelope-stage${isReleased ? ' envelope-stage--released' : ''}`}
      aria-label={isReleased ? 'Released mission briefing' : 'Locked classified mission briefing'}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <motion.div
        className="envelope-float"
        animate={isReleased ? { y: [0, -3, 0], rotate: [0, 0.3, 0] } : { y: [0, -5, 0], rotate: [-0.6, 0.6, -0.6] }}
        transition={{ duration: isReleased ? 7 : 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="envelope"
          animate={isReleased ? { x: [0, -5, 4, -3, 2, 0], rotate: [0, -1.2, 1, -0.6, 0.3, 0] } : { x: 0, rotate: 0 }}
          transition={{ duration: 0.78, delay: isReleased ? 0.05 : 0, ease: 'easeInOut' }}
        >
          <motion.div
            className="envelope__turner"
            initial={false}
            animate={{ rotateY: isReleased ? 180 : 0 }}
            transition={{ duration: 1.45, delay: isReleased ? 0.95 : 0, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="envelope__reverse" aria-hidden="true">
              <span className="envelope__reverse-label">MISSIONATHON // SEALED DOSSIER</span>
            </div>
            <div className="envelope__front">
              <div className="envelope__paper" />
              <div className="envelope__back" />
              {isReleased && (
                <HintCard title={missionTitle} text={missionText} image={missionImage} />
              )}
              <div className="envelope__pocket" />
              <motion.div
                className="envelope__flap"
                initial={false}
                animate={{ rotateX: isReleased ? 180 : 0 }}
                transition={{ duration: 1.05, delay: isReleased ? 1.75 : 0, ease: [0.65, 0, 0.35, 1] }}
              />
              <div className="envelope__crease envelope__crease--left" />
              <div className="envelope__crease envelope__crease--right" />
              <div className="envelope__crease envelope__crease--base" />
              <motion.div
                className="wax-seal"
                animate={isReleased ? { scale: [1, 1.16, 0.9, 0], opacity: [1, 1, 0.9, 0], rotate: [0, 8, -12, 22] } : { scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.72, delay: isReleased ? 0.48 : 0, ease: 'easeInOut' }}
                aria-hidden="true"
              >
              </motion.div>
              <motion.div
                className="seal-flash"
                initial={false}
                animate={isReleased ? { opacity: [0, 0.85, 0] } : { opacity: 0 }}
                transition={{ duration: 0.65, delay: isReleased ? 0.44 : 0 }}
                aria-hidden="true"
              />
              <div className="envelope__label" aria-hidden="true">TOP SECRET // MISSIONATHON</div>
              <div className="envelope__stamp" aria-hidden="true">SEALED</div>
            </div>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!isReleased && (
            <motion.div
              className="locked-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.66, 1, 0.66] }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              aria-live="polite"
            >
              <span className="locked-message__icon" aria-hidden="true">//</span>
              <span>MISSION BRIEFING LOCKED</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  )
}
