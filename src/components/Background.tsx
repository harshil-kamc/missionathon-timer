import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Comprehensive Money Heist image library combining local assets & official high-res gallery
const backgroundImages = [
  '/la casa de papel.jpg',
  '/money_heist_crew_1791369136971.jpg',
  '/money_heist_vault_1791369163774.jpg',
  '/money_heist_mask_1791369309304.jpg',
  '/money-heist-ending.webp',
  '/mission_dossier_1791369365944.jpg',
  '/mission-image.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/209/523445.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/219/547630.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/284/711600.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/353/884776.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/353/884777.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/442/1105757.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/631/1577982.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/205/514797.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/246/616031.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/270/676261.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/270/676262.jpg',
  'https://static.tvmaze.com/uploads/images/original_untouched/270/676263.jpg',
].map((src) => encodeURI(src))

// Consistent 8-second rotation (5 to 10 seconds interval)
const BACKGROUND_INTERVAL_MS = 8000

export default function Background() {
  const [activeImage, setActiveImage] = useState(0)

  // Preload upcoming background images to ensure silky crossfades
  useEffect(() => {
    const nextIdx = (activeImage + 1) % backgroundImages.length
    const img = new Image()
    img.src = backgroundImages[nextIdx]
  }, [activeImage])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveImage((currentImage) => (currentImage + 1) % backgroundImages.length)
    }, BACKGROUND_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="background" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div
          key={activeImage}
          className="background__image"
          style={{ backgroundImage: `url(${backgroundImages[activeImage]})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </AnimatePresence>
      <div className="background__subtle-tint" />
    </div>
  )
}
