/**
 * The sound a pilot asks for, built from a handful of knobs into the
 * instrument's twelve-point curve and its "when it sounds" thresholds.
 *
 * Layout of the twelve points:
 *   0  −10 m/s        sink tone, low end
 *   1  just below the near-zero zone: sink tone, top end
 *   2  start of the near-zero zone (ticks or a soft tone, or nothing)
 *   3  just below the climb start
 *   4  climb start: the slowest, lowest climb beep
 *   5–9  climb up to +5 m/s, spaced to follow the curve's bend
 *   10, 11  +7 and +10 m/s
 * The near-zero zone sounds only when the climb threshold is set below zero;
 * otherwise those points lie in silence, as on most varios.
 */
import type { Curves, Trigger } from './engine'

export type Shape = 'linear' | 'weak'
export type NearZero = 'silent' | 'ticks' | 'tone'
export type SinkStyle = 'continuous' | 'pulsed' | 'slow'

/** Where along the climb (0 = climb start, 1 = +5 m/s) a bend is sampled. */
export const BEND_Q = [0.05, 0.15, 0.3, 0.55, 1]

export interface Bend {
  /** Where along the climb each value sits, increasing, last = 1; BEND_Q when absent. */
  q?: number[]
  f: number[]
  c: number[]
  d: number[]
}

export interface Knobs {
  /** Hz at the climb start and at +5 m/s. */
  pitchLow: number
  pitchHigh: number
  /** Beep period, ms, at the climb start and at +5 m/s. */
  tempoLow: number
  tempoHigh: number
  /** Share of the period that sounds, %, at the climb start and at +5 m/s. */
  dutyLow: number
  dutyHigh: number
  /** 'weak': most of the change happens below +1 m/s. */
  shape: Shape
  /**
   * A vario's own bend of tone, period and beep share over the climb, from the
   * climb start (0) to +5 m/s (1), sampled at BEND_Q; each 0…1 from the low to
   * the high value. Replaces `shape` while present: a familiar vario keeps its
   * nonlinear curve through every later answer.
   */
  bend?: Bend
  /** Climb beeps start here, m/s. */
  climbStart: number
  /** The climb tone holds this much below where it started, m/s. */
  hold: number
  nearZero: NearZero
  /** The near-zero sound starts here (sink side), m/s, below zero. */
  nearFrom: number
  /** Sink alarm, m/s; −10 = never. */
  sinkOn: number
  /** On the way out of sink the alarm holds this much longer, m/s. */
  sinkHold: number
  sinkStyle: SinkStyle
  /** Sink tone at the alarm, Hz. */
  sinkPitch: number
  /** Sink tone falls as the sink grows. */
  sinkFalls: boolean
  /** Vario averaging, s. */
  average: number
}

export const DEFAULT_KNOBS: Knobs = {
  pitchLow: 600,
  pitchHigh: 1300,
  tempoLow: 600,
  tempoHigh: 200,
  dutyLow: 50,
  dutyHigh: 50,
  shape: 'linear',
  climbStart: 0.1,
  hold: 0.05,
  nearZero: 'silent',
  nearFrom: -0.5,
  sinkOn: -2.5,
  sinkHold: 0,
  sinkStyle: 'continuous',
  sinkPitch: 420,
  sinkFalls: true,
  average: 0.3,
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const r = Math.round

/** 0…1 → 0…1; 'weak' puts most of the change at the start. */
export function bend(u: number, shape: Shape): number {
  return shape === 'weak' ? Math.log1p(9 * u) / Math.log1p(9) : u
}

function bendAt(qs: number[], table: number[], u: number): number {
  const xs = [0, ...qs]
  const ys = [0, ...table]
  for (let i = 1; i < xs.length; i++) {
    if (u <= xs[i]!)
      return ys[i - 1]! + (ys[i]! - ys[i - 1]!) * (u - xs[i - 1]!) / (xs[i]! - xs[i - 1]!)
  }
  return ys[ys.length - 1]!
}

/** A bend moved part of the way towards a plain shape: 0 keeps it, 1 replaces it. */
export function blendBend(b: Bend, shape: Shape, w: number): Bend {
  const qs = b.q ?? BEND_Q
  const to = qs.map((q) => bend(q, shape))
  const mix = (t: number[]) => t.map((y, i) => y + (to[i]! - y) * w)
  return { q: qs, f: mix(b.f), c: mix(b.c), d: mix(b.d) }
}

function validBend(b: Bend | undefined): Bend | undefined {
  const ok = (t: unknown) => Array.isArray(t) && t.length === BEND_Q.length && t.every((x) => Number.isFinite(x))
  if (!b || !ok(b.f) || !ok(b.c) || !ok(b.d))
    return undefined
  const q = b.q && ok(b.q) && b.q.every((x, i) => x > (i ? b.q![i - 1]! + 0.01 : 0.01)) && b.q[b.q.length - 1] === 1 ? b.q : BEND_Q
  const c2 = (t: number[]) => t.map((x) => Math.round(clamp(x, -0.5, 1.5) * 1000) / 1000)
  return { q: q.map((x) => Math.round(x * 1000) / 1000), f: c2(b.f), c: c2(b.c), d: c2(b.d) }
}

/** Normalise knobs into ranges the instrument accepts and that make sense together. */
export function tidy(k: Knobs): Knobs {
  const sinkOn = clamp(k.sinkOn, -10, -1)
  const nearFrom = clamp(k.nearFrom, Math.max(sinkOn + 0.1, -1.5), -0.1)
  return {
    ...k,
    bend: validBend(k.bend),
    pitchLow: clamp(r(k.pitchLow), 200, 3500),
    pitchHigh: clamp(r(Math.max(k.pitchHigh, k.pitchLow + 50)), 250, 5000),
    tempoLow: clamp(r(k.tempoLow), 150, 1200),
    tempoHigh: clamp(r(Math.min(k.tempoHigh, k.tempoLow - 50)), 80, 1100),
    dutyLow: clamp(r(k.dutyLow), 10, 90),
    dutyHigh: clamp(r(k.dutyHigh), 10, 90),
    climbStart: clamp(Math.round(k.climbStart * 100) / 100, 0, 1),
    hold: clamp(Math.round(k.hold * 100) / 100, 0, 0.3),
    nearFrom: Math.round(nearFrom * 100) / 100,
    sinkOn: Math.round(sinkOn * 100) / 100,
    sinkHold: clamp(Math.round((k.sinkHold ?? 0) * 100) / 100, 0, 1),
    average: clamp(Math.round(k.average * 100) / 100, 0.05, 2),
  }
}

export interface Sound {
  curves: Curves
  trigger: Trigger
}

export function generate(input: Knobs): Sound {
  const k = tidy(input)
  // Near zero first: the climb curve has to start above it.
  const n0 = r(k.nearFrom * 100)
  // Climb beeps start where the climb tone can still be heard: with silence near
  // zero that is the bottom of the hold, so the held stretch plays the slowest
  // climb beep and never the near-zero ticks. With a near-zero sound the hold
  // belongs to that sound, and the climb beeps start at climbStart.
  const c0 = Math.max(n0 + 2, r((k.nearZero === 'silent' ? k.climbStart - k.hold : k.climbStart) * 100))
  const top = 500
  const climbAt = (v: number) => {
    const u = clamp((v - c0) / (top - c0), 0, 1)
    const b = bend(u, k.shape)
    const bq = k.bend?.q ?? BEND_Q
    const bf = k.bend ? bendAt(bq, k.bend.f, u) : b
    const bc = k.bend ? bendAt(bq, k.bend.c, u) : b
    const bd = k.bend ? bendAt(bq, k.bend.d, u) : b
    return {
      f: k.pitchLow + (k.pitchHigh - k.pitchLow) * bf,
      cycle: k.tempoLow + (k.tempoHigh - k.tempoLow) * bc,
      duty: k.dutyLow + (k.dutyHigh - k.dutyLow) * bd,
    }
  }
  // Climb points: denser where the curve bends.
  const qs = k.bend ? (k.bend.q ?? BEND_Q) : k.shape === 'weak' ? [0.04, 0.12, 0.3, 0.6, 1] : [0.1, 0.25, 0.45, 0.7, 1]
  const climbV = [c0, ...qs.map((q) => r(c0 + (top - c0) * q)), 700, 1000]
  const climb = climbV.map((v) => {
    if (v <= top)
      return climbAt(v)
    // Above +5: a little higher and a little faster, then level.
    const s = v === 700 ? 0.5 : 1
    return {
      f: k.pitchHigh * (1 + 0.12 * s),
      cycle: Math.max(60, k.tempoHigh * (1 - 0.2 * s)),
      duty: k.dutyHigh,
    }
  })

  // Near zero.
  const near = k.nearZero === 'tone'
    ? { f: 330, cycle: 1000, duty: 15 }
    : { f: k.pitchLow, cycle: 800, duty: 5 }

  // Sink: the tone at the alarm and at −10 m/s.
  const sinkTop = clamp(k.sinkPitch ?? 420, 150, 1500)
  const sinkLow = k.sinkFalls ? Math.max(120, sinkTop * 0.5) : sinkTop
  const sinkPat = k.sinkStyle === 'continuous'
    ? { cycle: 200, duty: 100 }
    : k.sinkStyle === 'pulsed' ? { cycle: 500, duty: 70 } : { cycle: 1000, duty: 25 }
  const s1 = n0 - 1
  const sinkOnCm = r(k.sinkOn * 100)
  // Linear in between, pinned at the alarm and at −10.
  const sinkF = (v: number) => sinkOnCm <= -1000 ? sinkTop : sinkTop + (sinkTop - sinkLow) * (v - sinkOnCm) / (sinkOnCm + 1000)

  const varioDots = [-1000, s1, n0, c0 - 1, ...climbV]
  const freqDots = [sinkLow, sinkF(s1), near.f, near.f, ...climb.map((x) => x.f)]
  const cycleDots = [sinkPat.cycle, sinkPat.cycle, near.cycle, near.cycle, ...climb.map((x) => x.cycle)]
  const dutyDots = [sinkPat.duty, sinkPat.duty, near.duty, near.duty, ...climb.map((x) => x.duty)]
  const curves: Curves = {
    varioDots,
    freqDots: freqDots.map((x) => clamp(r(x), 100, 6000)),
    cycleDots: cycleDots.map((x) => clamp(r(x), 10, 2000)),
    dutyDots: dutyDots.map((x) => clamp(r(x), 1, 100)),
  }

  const sounding = k.nearZero !== 'silent'
  const climbOn = sounding ? k.nearFrom : k.climbStart
  const climbOff = Math.max(k.sinkOn, Math.round((climbOn - k.hold) * 100) / 100)
  const trigger: Trigger = {
    climbOn,
    climbOff,
    sinkOn: k.sinkOn,
    // The hold never reaches the near-zero sound or the climb tone.
    sinkOff: Math.round(Math.min(k.sinkOn + k.sinkHold, climbOff - 0.05) * 100) / 100,
    hyst: 0,
    average: k.average,
  }
  return { curves, trigger }
}
