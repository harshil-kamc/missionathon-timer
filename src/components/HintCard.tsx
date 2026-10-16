import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'

type HintCardProps = {
  image: string
}

export default function HintCard({ image }: HintCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!isExpanded) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  return (
    <>
      {/* Card emerging from envelope pocket */}
      <motion.div
        className="hint-card"
        initial={prefersReducedMotion ? false : { y: '10%', opacity: 0, scale: 0.95 }}
        animate={{ y: '-52%', opacity: 1, scale: 1 }}
        exit={{ y: '10%', opacity: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.95,
          delay: prefersReducedMotion ? 0 : 0.25,
          ease: [0.16, 1, 0.3, 1],
        }}
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(true)
        }}
        role="button"
        tabIndex={0}
        aria-label="Classified mission dossier. Click to inspect fullscreen."
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setIsExpanded(true)
          }
        }}
      >
        <div className="hint-card__inner">
          {image && (
            <img
              className="mission-card__image"
              src={image}
              alt="Mission dossier briefing"
              loading="eager"
            />
          )}
          <div className="hint-card__overlay">
            <span className="hint-card__badge">TOP SECRET DOSSIER</span>
            <span className="hint-card__action">CLICK TO INSPECT</span>
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Inspector Modal via Portal */}
      <AnimatePresence>
        {isExpanded &&
          createPortal(
            <motion.div
              className="dossier-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsExpanded(false)}
            >
              <motion.div
                className="dossier-modal-container"
                initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Classified Mission Dossier"
              >
                <div className="dossier-modal-header">
                  <div className="dossier-modal-title">
                    <span className="dossier-modal-stamp">CLASSIFIED TRANSMISSION</span>
                    <h2>MISSION DOSSIER DECLASSIFIED</h2>
                  </div>
                  <button
                    type="button"
                    className="dossier-modal-close"
                    onClick={() => setIsExpanded(false)}
                    aria-label="Close dossier"
                  >
                    <span>&times;</span>
                    <span className="dossier-modal-close-label">CLOSE</span>
                  </button>
                </div>

                <div className="dossier-modal-body">
                  {image ? (
                    <img
                      className="dossier-modal-img"
                      src={image}
                      alt="Mission Dossier Full View"
                    />
                  ) : (
                    <div className="dossier-modal-placeholder">
                      <p>MISSION TRANSMISSION ENCRYPTED</p>
                    </div>
                  )}
                </div>

                <div className="dossier-modal-footer">
                  <span>MISSIONATHON PROTOCOL · LA CASA DE PAPEL</span>
                  <span className="dossier-modal-esc">PRESS ESC TO RETURN</span>
                </div>
              </motion.div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </>
  )
}
