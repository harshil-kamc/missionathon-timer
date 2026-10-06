import missionImage from '../../la casa de papel.jpg'

export const dashboardConfig = {
  targetTime: '2026-10-06T22:46:00',
  missionTitle: '',
  // Enter the target in IST; timestamps without an offset are interpreted as IST.',
  missionText: '',
  // Put reveal images in public/ and use a path such as /mission-image.jpg.
  missionImage,
} as const
