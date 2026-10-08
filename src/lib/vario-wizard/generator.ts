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
  /** Climb beeps start here, m/s. */
  climbStart: number
  /** The climb tone holds this much below where it started, m/s. */
  hold: number
  nearZero: NearZero
  /** The near-zero sound starts here (sink side), m/s, below zero. */
  nearFrom: number
  /** Sink alarm, m/s; −10 = never. */
  sinkOn: number
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
  sinkStyle: 'continuous',
  sinkPitch: 420,
  sinkFalls: true,
  average: 0.3,
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const r = Math.round

/** 0…1 → 0…1; 'weak' puts most of the change at the start. */
function bend(u: number, shape: Shape): number {
  return shape === 'weak' ? Math.log1p(9 * u) / Math.log1p(9) : u
}

/** Normalise knobs into ranges the instrument accepts and that make sense together. */
export function tidy(k: Knobs): Knobs {
  const sinkOn = clamp(k.sinkOn, -10, -1)
  const nearFrom = clamp(k.nearFrom, Math.max(sinkOn + 0.1, -1.5), -0.1)
  return {
    ...k,
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
    average: clamp(Math.round(k.average * 100) / 100, 0.05, 2),
  }
}

export interface Sound {
  curves: Curves
  trigger: Trigger
}

export function generate(input: Knobs): Sound {
  const k = tidy(input)
  const c0 = r(k.climbStart * 100)
  const top = 500
  const climbAt = (v: number) => {
    const b = bend(clamp((v - c0) / (top - c0), 0, 1), k.shape)
    return {
      f: k.pitchLow + (k.pitchHigh - k.pitchLow) * b,
      cycle: k.tempoLow + (k.tempoHigh - k.tempoLow) * b,
      duty: k.dutyLow + (k.dutyHigh - k.dutyLow) * b,
    }
  }
  // Climb points: denser where the curve bends.
  const qs = k.shape === 'weak' ? [0.04, 0.12, 0.3, 0.6, 1] : [0.1, 0.25, 0.45, 0.7, 1]
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
  const n0 = r(k.nearFrom * 100)
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
    sinkOff: k.sinkOn,
    hyst: 0,
    average: k.average,
  }
  return { curves, trigger }
}
