type StatusLineProps = {
  health: string
  stage: string
}

function readHealthState(health: string): 'ready' | 'warning' | 'checking' {
  const normalized = health.toLowerCase()

  if (normalized.includes('ready') || normalized.includes('running')) {
    return 'ready'
  }

  if (normalized.includes('checking') || normalized.includes('preparing')) {
    return 'checking'
  }

  return 'warning'
}

export function StatusLine({ health, stage }: StatusLineProps) {
  const healthState = readHealthState(health)
  const isEdgeAi = health.toLowerCase().includes('cloudflare')
  const statusLabel = isEdgeAi
    ? `Edge AI (zero storage): ${health}. Current activity: ${stage}`
    : `On-device AI: ${health}. Current activity: ${stage}`
  const compactHealth = healthState === 'ready'
    ? 'Ready'
    : healthState === 'checking'
      ? health.toLowerCase().includes('preparing') ? 'Preparing' : 'Checking'
      : 'Unavailable'

  return (
    <section className={`status-line is-${healthState}`} aria-live="polite" aria-label={statusLabel}>
      <span className={`status-dot is-${healthState}`} aria-hidden="true" />
      <span className="status-copy">
        <strong>{isEdgeAi ? 'Edge AI · Zero storage' : 'On-device AI'}</strong>
        <span title={health}>{compactHealth}</span>
      </span>
      <span className="stage-copy">{stage}</span>
    </section>
  )
}
