import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type MissionData = {
  title: string
  text: string
  image: string
  revealType: 'image' | 'text' | 'both'
}

type TwistedEnvelopeProps = {
  isRevealed: boolean
  mission: MissionData
}

export default function TwistedEnvelope({ isRevealed, mission }: TwistedEnvelopeProps) {
  // Opening state starts closed, unfolds when isRevealed triggers
  const [isOpen, setIsOpen] = useState(isRevealed)
  // Step in the cinematic sequence: 'idle' | 'opening_flap' | 'emerging' | 'zoomed'
  const [animationStep, setAnimationStep] = useState<'idle' | 'opening_flap' | 'emerging' | 'zoomed'>('idle')
  // Dynamic aspect ratio of supplied mission image
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const timerRef = useRef<number[]>([])

  const clearTimers = () => {
    timerRef.current.forEach(window.clearTimeout)
    timerRef.current = []
  }

  // Orchestrate the physical sequence when isRevealed changes
  useEffect(() => {
    clearTimers()

    if (isRevealed) {
      // 1. Envelope in focus
      setIsOpen(true)
      setAnimationStep('opening_flap')

      // 2. Flap unfolds -> Card begins emerging
      const t1 = window.setTimeout(() => {
        setAnimationStep('emerging')
      }, 700)

      // 3. Card emerges and continuously zooms toward viewer -> full visual
      const t2 = window.setTimeout(() => {
        setAnimationStep('zoomed')
      }, 1600)

      timerRef.current = [t1, t2]
    } else {
      setIsOpen(false)
      setAnimationStep('idle')
    }

    return clearTimers
  }, [isRevealed])

  // Detect image aspect ratio on load to preserve 100% uncropped ratio
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight)
      setImageLoaded(true)
    }
  }

  const hasImage = Boolean(mission.image && (mission.revealType === 'image' || mission.revealType === 'both'))
  const hasText = Boolean((mission.title || mission.text) && (mission.revealType === 'text' || mission.revealType === 'both'))

  const handleManualClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearTimers()
    setAnimationStep('idle')
    setIsOpen(false)
  }

  const handleManualReopen = () => {
    if (!isOpen && isRevealed) {
      clearTimers()
      setIsOpen(true)
      setAnimationStep('opening_flap')
      const t1 = window.setTimeout(() => setAnimationStep('emerging'), 600)
      const t2 = window.setTimeout(() => setAnimationStep('zoomed'), 1500)
      timerRef.current = [t1, t2]
    }
  }

  // Calculate dynamic responsive bounds for container
  const isLandscape = aspectRatio ? aspectRatio >= 1 : true
  const cardMaxWidth = isLandscape
    ? 'min(92vw, 1100px)'
    : 'min(86vw, 680px)'
  const cardMaxHeight = isLandscape
    ? 'min(78vh, 640px)'
    : 'min(86vh, 880px)'

  return (
    <div className={`envelope-cinema-viewport${animationStep === 'zoomed' ? ' envelope-cinema-viewport--zoomed' : ''}`}>
      {/* 3D Envelope Container */}
      <motion.div
        className={`envelope-heist-structure${isOpen ? ' envelope-heist-structure--open' : ''}${!isOpen && isRevealed ? ' envelope-heist-structure--clickable' : ''}`}
        onClick={handleManualReopen}
        role={!isOpen && isRevealed ? 'button' : undefined}
        tabIndex={!isOpen && isRevealed ? 0 : undefined}
        aria-label={!isOpen && isRevealed ? 'Click to re-open confidential dossier' : undefined}
        initial={{ opacity: 0, scale: 0.94, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Back panel interior with Money Heist crimson lining */}
        <div className="envelope-heist__back">
          <div className="envelope-heist__interior-pattern" />
        </div>

        {/* Top 3D Fold Flap (Smooth geometric fold, seal removed as requested) */}
        <motion.div
          className="envelope-heist__flap"
          initial={false}
          animate={{
            rotateX: isOpen ? -180 : 0,
            zIndex: isOpen ? 2 : 14,
          }}
          transition={{
            duration: 0.75,
            ease: [0.25, 1, 0.5, 1],
            delay: isOpen ? 0.05 : 0.2,
          }}
        >
          <div className="envelope-heist__flap-body" />
          <div className="envelope-heist__flap-inner" />
        </motion.div>

        {/* The Confidential Mission Dossier Card */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={`heist-dossier-card${animationStep === 'zoomed' ? ' heist-dossier-card--dominant' : ''}`}
              initial={{ y: '20%', opacity: 0, scale: 0.92 }}
              animate={
                animationStep === 'opening_flap'
                  ? { y: '5%', opacity: 0.9, scale: 0.96 }
                  : animationStep === 'emerging'
                  ? { y: '-42%', opacity: 1, scale: 1.08 }
                  : {
                      // Final continuous zoom: reaches dominant full-screen presentation
                      y: '-68%',
                      opacity: 1,
                      scale: 1.48,
                    }
              }
              exit={{ y: '20%', opacity: 0, scale: 0.92 }}
              transition={{
                duration: animationStep === 'zoomed' ? 1.1 : 0.75,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                maxWidth: cardMaxWidth,
                maxHeight: cardMaxHeight,
              }}
            >
              <div
                className="heist-dossier-card__border-frame"
                style={{
                  aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
                }}
              >
                {/* Small slightly visible close button to re-envelope */}
                <button
                  type="button"
                  className="heist-dossier-card__close-btn"
                  onClick={handleManualClose}
                  aria-label="Close dossier and return to envelope"
                  title="Close to envelope"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>

                {/* The Uncropped Mission Image (Strictly object-fit: contain guaranteed) */}
                {hasImage && (
                  <div className="heist-dossier-card__media">
                    <img
                      src={mission.image}
                      alt={mission.title || 'Mission reveal document'}
                      className="heist-dossier-card__img"
                      loading="eager"
                      onLoad={handleImageLoad}
                    />
                  </div>
                )}

                {/* Mission Text Directives (if provided) */}
                {hasText && (
                  <div className="heist-dossier-card__content">
                    {mission.title && <h3 className="heist-dossier-card__title">{mission.title}</h3>}
                    {mission.text && <p className="heist-dossier-card__body">{mission.text}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Front pocket holding the bottom of the card */}
        <div className="envelope-heist__pocket">
          <div className="envelope-heist__pocket-left" />
          <div className="envelope-heist__pocket-right" />
          <div className="envelope-heist__pocket-base" />

          {/* Re-open helper if user closed it while revealed */}
          {!isOpen && isRevealed && (
            <div className="envelope-heist__reopen-hint">
              <span>CLICK TO OPEN</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
