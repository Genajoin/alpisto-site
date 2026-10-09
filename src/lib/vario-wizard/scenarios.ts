/**
 * Vario traces to listen to: the whole flight on the result screen and a short
 * clip for each question. Values are what the instrument's sensor reads
 * before its averaging, cm/s; a light noise is mixed in so a sound is heard
 * the way it behaves in real air.
 */

export type ClipKey = 'mini' | 'flight' | 'climb' | 'start' | 'fade' | 'near' | 'sink' | 'bumpy' | 'surge'

export interface Clip {
  lenMs: number
  air: (tMs: number) => number
  /** Range of the little trace drawn under the play button, m/s. */
  range: [number, number]
}

/** Deterministic noise: AR(1), sigma cm/s, correlation time tau ms. */
function noise(seed: number, sigma: number, tauMs: number, lenMs: number): (t: number) => number {
  let s = seed >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd())
  const step = 16
  const a = Math.exp(-step / tauMs)
  const k = Math.sqrt(1 - a * a) * sigma
  const xs: number[] = []
  let x = gauss() * sigma
  for (let t = 0; t <= lenMs + step; t += step) {
    xs.push(x)
    x = a * x + k * gauss()
  }
  return (t) => xs[Math.min(xs.length - 1, Math.max(0, Math.floor(t / step)))]!
}

/** Piecewise-linear trace through [s, m/s] knots. */
function path(knots: [number, number][]): (tMs: number) => number {
  return (tMs) => {
    const t = tMs / 1000
    if (t <= knots[0]![0])
      return knots[0]![1] * 100
    for (let i = 1; i < knots.length; i++) {
      const [t1, v1] = knots[i]!
      if (t <= t1) {
        const [t0, v0] = knots[i - 1]!
        const u = (t - t0) / (t1 - t0)
        // Smooth in and out of each knot, the way air changes.
        const e = u * u * (3 - 2 * u)
        return (v0 + (v1 - v0) * e) * 100
      }
    }
    return knots[knots.length - 1]![1] * 100
  }
}

function clip(knots: [number, number][], sigma: number, tauMs: number, seed: number, range: [number, number], extra?: (t: number) => number): Clip {
  const lenMs = knots[knots.length - 1]![0] * 1000
  const base = path(knots)
  const n = noise(seed, sigma, tauMs, lenMs)
  return { lenMs, air: (t) => base(t) + n(t) + (extra ? extra(t) : 0), range }
}

/** Circling in a thermal: the climb rises and falls once per turn. */
const circling = (from: number, to: number, amp: number, periodS: number) => (tMs: number) => {
  const t = tMs / 1000
  if (t < from || t > to)
    return 0
  const fade = Math.min(1, (t - from) / 2, (to - t) / 2)
  return amp * 100 * fade * Math.sin(2 * Math.PI * (t - from) / periodS)
}

export const CLIPS: Record<ClipKey, Clip> = {
  // Glide, the air improving, into the core, centring, the climb fading, out into sink.
  flight: clip(
    [[0, -1.2], [6, -1.2], [10, -0.4], [13, 0.6], [16, 2.3], [30, 2.1], [35, 0.3], [38, -0.5], [42, -3.2], [46, -1.4]],
    14, 400, 7, [-4, 4], circling(16, 30, 0.9, 7),
  ),
  // A short thermal: glide, in, a few seconds of climb, out into sink.
  mini: clip([[0, -1.2], [2, -1.2], [5, 1.6], [9, 2.2], [11, 0.4], [13, -2.8], [15, -2.8], [17, -1.2]], 12, 400, 31, [-4, 3.5]),
  // The climb grows steadily from zero to +4.
  climb: clip([[0, 0], [1, 0], [13, 4], [14, 4]], 4, 200, 11, [-1, 5]),
  // Slowly from a small sink across zero into a weak climb.
  start: clip([[0, -0.5], [1, -0.5], [13, 0.8], [14, 0.8]], 6, 300, 13, [-1, 1.5]),
  // A climb of +1.5 fades out in bumpy air.
  fade: clip([[0, 1.5], [2, 1.5], [12, -0.8], [14, -0.8]], 16, 500, 17, [-1.5, 2.5]),
  // Gliding, the sink eases off to a small minus, then the first weak lift.
  near: clip([[0, -1.6], [2, -1.6], [8, -0.3], [11, -0.3], [14, 0.4]], 8, 400, 19, [-2.5, 1]),
  // Into stronger and stronger sink, and out of it again.
  sink: clip([[0, -1], [1, -1], [8, -4.5], [10, -4.5], [17, -1], [18, -1]], 10, 400, 23, [-5, 0.5]),
  // A +1.5 thermal in rough air.
  bumpy: clip([[0, 1.5], [12, 1.5]], 70, 300, 29, [-1.5, 4]),
  // Smooth air, two quick surges to +4 and back: a beep that follows the vario slides up and down.
  surge: clip([[0, 0.3], [1.5, 0.3], [3, 4], [5, 4], [6.5, 0.5], [8, 0.5], [9.5, 4], [11.5, 4], [13, 0.3]], 3, 400, 37, [-1, 5]),
}
