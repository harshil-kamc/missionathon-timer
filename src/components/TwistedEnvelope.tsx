import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

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

type SequenceStep =
  | 'idle'
  | 'descending'
  | 'settled'
  | 'opening_flap'
  | 'emerging'
  | 'zoomed'
  | 'closed'

export default function TwistedEnvelope({ isRevealed, mission }: TwistedEnvelopeProps) {
  const prefersReducedMotion = useReducedMotion()

  // Track responsive screen width for dynamic zoom scaling
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = windowWidth < 640
  const isTablet = windowWidth >= 640 && windowWidth < 1024
  // Responsive zoom scale: desktop expands large & dominant, mobile fits viewport cleanly
  const zoomScale = isMobile ? 1.22 : isTablet ? 1.55 : 1.88

  // Current stage in the choreographed Money Heist sequence
  const [step, setStep] = useState<SequenceStep>('idle')
  // Flap Z-Index switches once flap folds past 90 degrees so it rests behind emerging card
  const [flapZIndex, setFlapZIndex] = useState(20)

  // Natural image dimensions & aspect ratio
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const timerRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timerRef.current.forEach((t) => window.clearTimeout(t))
    timerRef.current = []
  }, [])

  // Full cinematic sequence orchestrator
  const startCinematicSequence = useCallback(() => {
    clearTimers()

    if (prefersReducedMotion) {
      setStep('zoomed')
      setFlapZIndex(2)
      return
    }

    // Phase 1 (0ms): Envelope glides down gracefully from top into center stage
    setStep('descending')
    setFlapZIndex(20)

    // Phase 2 (1050ms): Envelope lands with solid physical weight; brief suspense pause
    const t1 = window.setTimeout(() => {
      setStep('settled')
    }, 1050)

    // Phase 3 (1450ms): Top 3D fold flap unseals and swings smoothly backwards
    const t2 = window.setTimeout(() => {
      setStep('opening_flap')
    }, 1450)

    // Flap Z-index handoff (1950ms): As flap tilts past vertical, it moves behind the card
    const t3 = window.setTimeout(() => {
      setFlapZIndex(2)
    }, 1950)

    // Phase 4 (2350ms): Card rises smoothly straight up out of the envelope pocket
    const t4 = window.setTimeout(() => {
      setStep('emerging')
    }, 2350)

    // Phase 5 (3450ms): Continuous camera push-in / zoom into dominant full-screen presentation
    const t5 = window.setTimeout(() => {
      setStep('zoomed')
    }, 3450)

    timerRef.current = [t1, t2, t3, t4, t5]
  }, [clearTimers, prefersReducedMotion])

  useEffect(() => {
    if (isRevealed) {
      startCinematicSequence()
    } else {
      clearTimers()
      setStep('idle')
      setFlapZIndex(20)
    }

    return clearTimers
  }, [isRevealed, startCinematicSequence, clearTimers])

  // Detect image aspect ratio on load (guarantees zero cropping)
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight)
    }
  }

  // Close card back into envelope smoothly
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearTimers()

    // Step down to emerging -> tucked -> flap closed
    setStep('emerging')
    const t1 = window.setTimeout(() => {
      setStep('settled')
      setFlapZIndex(20)
    }, 700)

    const t2 = window.setTimeout(() => {
      setStep('closed')
    }, 1500)

    timerRef.current = [t1, t2]
  }

  // Open envelope if closed
  const handleOpen = () => {
    if (step === 'closed') {
      clearTimers()
      setStep('opening_flap')
      const t1 = window.setTimeout(() => setFlapZIndex(2), 500)
      const t2 = window.setTimeout(() => setStep('emerging'), 850)
      const t3 = window.setTimeout(() => setStep('zoomed'), 1900)
      timerRef.current = [t1, t2, t3]
    }
  }

  // Replay the full cinematic sequence from the top
  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation()
    startCinematicSequence()
  }

  const hasImage = Boolean(mission.image && (mission.revealType === 'image' || mission.revealType === 'both'))
  const hasText = Boolean((mission.title || mission.text) && (mission.revealType === 'text' || mission.revealType === 'both'))

  const isOpenFlap = step === 'opening_flap' || step === 'emerging' || step === 'zoomed'
  const isZoomed = step === 'zoomed'

  return (
    <div className={`envelope-cinema-viewport ${isZoomed ? 'envelope-cinema-viewport--zoomed' : ''}`}>
      {/* 3D Envelope Body Structure */}
      <motion.div
        className={`envelope-heist-structure ${isZoomed ? 'envelope-heist-structure--blurred' : ''} ${step === 'closed' ? 'envelope-heist-structure--clickable' : ''}`}
        onClick={step === 'closed' ? handleOpen : undefined}
        role={step === 'closed' ? 'button' : undefined}
        tabIndex={step === 'closed' ? 0 : undefined}
        aria-label={step === 'closed' ? 'Click to unseal and inspect confidential dossier' : undefined}
        initial={prefersReducedMotion ? false : { opacity: 0, y: -260, scale: 0.9, rotateX: 16 }}
        animate={{
          opacity: isZoomed ? 0.22 : 1,
          y: 0,
          scale: isZoomed ? 0.92 : 1,
          rotateX: 0,
        }}
        transition={{
          duration: prefersReducedMotion ? 0 : 1.05,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* Back panel interior with Money Heist crimson lining */}
        <div className="envelope-heist__back">
          <div className="envelope-heist__interior-pattern" />
        </div>

        {/* Top 3D Fold Flap (Smooth geometric fold with dual-sided photorealistic depth) */}
        <motion.div
          className="envelope-heist__flap"
          initial={false}
          animate={{
            rotateX: isOpenFlap ? -178 : 0,
            zIndex: flapZIndex,
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.95,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Front Face: Visible when closed */}
          <div className="envelope-heist__flap-face envelope-heist__flap-face--front">
            <div className="envelope-heist__flap-body" />
            <div className="envelope-heist__flap-seam-highlight" />
          </div>

          {/* Back Face: Rotates upward to face viewer when opened */}
          <div className="envelope-heist__flap-face envelope-heist__flap-face--back">
            <div className="envelope-heist__flap-inner" />
            <div className="envelope-heist__flap-crease-shadow" />
          </div>
        </motion.div>

        {/* The Confidential Mission Dossier Card */}
        <AnimatePresence>
          {isOpenFlap && (
            <motion.div
              className={`heist-dossier-card ${isZoomed ? 'heist-dossier-card--dominant' : ''}`}
              initial={prefersReducedMotion ? false : { y: '8%', opacity: 0, scale: 0.96 }}
              animate={
                step === 'emerging'
                  ? {
                      y: '-58%',
                      opacity: 1,
                      scale: 1.02,
                    }
                  : isZoomed
                  ? {
                      // Continuous forward camera dolly zoom to dominant visual
                      y: isMobile ? '-35%' : '-48%',
                      opacity: 1,
                      scale: zoomScale,
                    }
                  : {
                      y: '8%',
                      opacity: 1,
                      scale: 0.96,
                    }
              }
              exit={{ y: '8%', opacity: 0, scale: 0.96 }}
              transition={{
                duration: prefersReducedMotion ? 0 : isZoomed ? 1.35 : 1.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                transformOrigin: 'center center',
              }}
            >
              <div className="heist-dossier-card__border-frame">
                {/* Tactical Header Bar */}
                <div className="heist-dossier-card__top-bar">
                  <div className="heist-dossier-card__classification">
                    <span className="heist-dossier-card__pulse-dot" />
                    <span className="heist-dossier-card__badge-text">
                      CLASSIFIED // MISSION DIRECTIVE
                    </span>
                  </div>

                  <div className="heist-dossier-card__actions">
                    {/* Replay Cinematic Sequence */}
                    <button
                      type="button"
                      className="heist-dossier-card__action-btn"
                      onClick={handleReplay}
                      title="Replay cinematic reveal sequence"
                      aria-label="Replay reveal animation"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M14 8A6 6 0 1 1 8 2c2 0 3.8.9 5 2.4V2"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 6V2h-4"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="heist-dossier-btn-label">REPLAY</span>
                    </button>

                    {/* Smooth Return to Envelope */}
                    <button
                      type="button"
                      className="heist-dossier-card__action-btn heist-dossier-card__action-btn--close"
                      onClick={handleClose}
                      title="Close dossier back into envelope"
                      aria-label="Close dossier"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path
                          d="M2 2L10 10M10 2L2 10"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* The Uncropped Mission Image (Strictly object-fit: contain guaranteed) */}
                {hasImage && (
                  <div className="heist-dossier-card__media">
                    {/* Tactical Corner Markers */}
                    <span className="heist-corner-marker heist-corner-marker--tl" />
                    <span className="heist-corner-marker heist-corner-marker--tr" />
                    <span className="heist-corner-marker heist-corner-marker--bl" />
                    <span className="heist-corner-marker heist-corner-marker--br" />

                    <img
                      src={mission.image}
                      alt={mission.title || 'Mission reveal document'}
                      className="heist-dossier-card__img"
                      loading="eager"
                      onLoad={handleImageLoad}
                    />
                  </div>
                )}

                {/* Mission Directives (if provided) */}
                {hasText && (
                  <div className="heist-dossier-card__content">
                    {mission.title && (
                      <h3 className="heist-dossier-card__title">{mission.title}</h3>
                    )}
                    {mission.text && (
                      <p className="heist-dossier-card__body">{mission.text}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Front triangular pocket holding the card */}
        <div className="envelope-heist__pocket">
          <div className="envelope-heist__pocket-left" />
          <div className="envelope-heist__pocket-right" />
          <div className="envelope-heist__pocket-base" />

          {/* Re-open helper if user closed the card manually */}
          {step === 'closed' && (
            <div className="envelope-heist__reopen-hint">
              <span className="heist-reopen-pulse-icon" />
              <span>CLICK TO UNSEAL DOSSIER</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
