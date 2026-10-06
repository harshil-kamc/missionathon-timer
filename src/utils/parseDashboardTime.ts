export function parseDashboardTime(timestamp: string): number {
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
  const normalizedTimestamp = hasExplicitTimezone ? timestamp : `${timestamp}+05:30`

  return new Date(normalizedTimestamp).getTime()
}
