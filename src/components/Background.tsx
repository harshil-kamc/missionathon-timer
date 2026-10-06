import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import backgroundImageOne from '../../money-heist-ending.webp'
import backgroundImageTwo from '../../la casa de papel.jpg'
import backgroundImageThree from '../../Обои «Бумажный дом» на телефон 🖤❤️ _ La Casa de Papel _ Эстетика сериала.jpg'

const backgroundImages = [backgroundImageOne, backgroundImageTwo, backgroundImageThree]
const backgroundIntervalMs = 8000

export default function Background() {
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveImage((currentImage) => (currentImage + 1) % backgroundImages.length)
    }, backgroundIntervalMs)

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
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
      </AnimatePresence>
      <div className="background__glow background__glow--left" />
      <div className="background__glow background__glow--right" />
      <motion.div
        className="background__signal"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.14, 0] }}
        transition={{ duration: 8, repeat: Infinity, repeatDelay: 9, ease: 'easeInOut' }}
      />
      <div className="background__grain" />
      <div className="background__scanlines" />
      <div className="background__vignette" />
    </div>
  )
}
