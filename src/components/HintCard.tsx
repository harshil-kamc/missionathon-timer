import { motion } from 'framer-motion'

type HintCardProps = {
  title: string
  text: string
  image: string
}

export default function HintCard({ title, text, image }: HintCardProps) {
  return (
    <motion.div
      className="hint-card"
      initial={{ y: '15%', opacity: 0, rotate: -2, scale: 0.96 }}
      animate={{ y: '-72%', opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 1.15, delay: 2.75, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {image && <img className="mission-card__image" src={image} alt={title} />}
      <div className="hint-card__text-wrap">
        {title && <h2 className="mission-card__title">{title}</h2>}
        <motion.p
          className="hint-card__text"
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 1.4, delay: 4, ease: 'linear' }}
        >
          {text}
        </motion.p>
      </div>
    </motion.div>
  )
}
