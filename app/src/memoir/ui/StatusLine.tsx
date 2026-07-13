type StatusLineProps = {
  health: string
  stage: string
}

function readHealthState(health: string): 'ready' | 'warning' | 'checking' {
  const normalized = health.toLowerCase()

  if (normalized.includes('ready') || normalized.includes('running')) {
    return 'ready'
  }

  if (normalized.includes('checking')) {
    return 'checking'
  }

  return 'warning'
}

export function StatusLine({ health, stage }: StatusLineProps) {
  const healthState = readHealthState(health)
  const statusLabel = `On-device AI: ${health}. Current activity: ${stage}`

  return (
    <section className={`status-line is-${healthState}`} aria-live="polite" aria-label={statusLabel}>
      <span className={`status-dot is-${healthState}`} aria-hidden="true" />
      <span className="status-copy">
        <strong>On-device AI</strong>
        <span>{health}</span>
      </span>
      <span className="stage-copy">{stage}</span>
    </section>
  )
}
