/**
 * Integração de movimento com arrasto linear por eixo (birthDrag).
 * dv/dt = a - k·v  →  x(t) = (v0 - a/k)·(1 - e^{-kt})/k + a·t/k
 */

export function integrateAxisMotionWithDrag(
  v0: number,
  acceleration: number,
  drag: number,
  timeSeconds: number,
): number {
  if (timeSeconds <= 0) return 0

  const k = Math.max(Math.abs(drag), 1e-6)
  if (k < 1e-5) {
    return v0 * timeSeconds + 0.5 * acceleration * timeSeconds * timeSeconds
  }

  const expTerm = Math.exp(-k * timeSeconds)
  return ((v0 - acceleration / k) * (1 - expTerm)) / k + (acceleration * timeSeconds) / k
}

export function integrateVec3MotionWithDrag(
  velocity: [number, number, number],
  acceleration: [number, number, number],
  drag: [number, number, number],
  timeSeconds: number,
): [number, number, number] {
  return [
    integrateAxisMotionWithDrag(velocity[0], acceleration[0], drag[0], timeSeconds),
    integrateAxisMotionWithDrag(velocity[1], acceleration[1], drag[1], timeSeconds),
    integrateAxisMotionWithDrag(velocity[2], acceleration[2], drag[2], timeSeconds),
  ]
}
