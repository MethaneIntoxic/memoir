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
  const statusLabel = `AI status: ${healthState}`

  return (
    <section className="status-line" aria-live="polite" aria-label={statusLabel} data-stage={stage}>
      <span className={`status-dot is-${healthState}`} />
    </section>
  )
}
