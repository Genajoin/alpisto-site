/**
 * A familiar sound as wizard knobs: the vario a pilot knows by ear, read off its
 * twelve-point curve (src/data/vario-sound/catalog.json, the FlyBeeper app's
 * list). Only how it sounds is taken; when it sounds comes from where the pilot
 * flies. The wizard keeps working in knobs, so the result is "close to" that
 * vario, and every later answer and fine-tune still applies.
 */
import catalog from '../../data/vario-sound/catalog.json'
import { interp, type Curves } from './engine'
import type { Knobs } from './generator'

interface Entry {
  id: string
  name: string
  curves?: Curves
  trigger?: { climbOn: number, climbOff: number, sinkOn: number, sinkOff: number, hyst?: number, average?: number }
}

/**
 * What pilots fly with: the brand name (not translated) and the list entry that
 * sounds like it. Phone apps and the no-vario answers are worded per language
 * (i18n `instruments`); `name` is what a question calls it.
 */
export const INSTRUMENTS: { key: string, name: string, entry: string | null }[] = [
  { key: 'xctracer', name: 'XC Tracer', entry: 'brand.xctracer' },
  { key: 'flymaster', name: 'Flymaster', entry: 'brand.flymaster' },
  { key: 'skytraxx', name: 'Skytraxx', entry: 'brand.skytraxx' },
  { key: 'syride', name: 'Syride', entry: 'brand.syride' },
  { key: 'skydrop', name: 'SkyDrop', entry: 'brand.skydrop' },
  { key: 'brauniger', name: 'Bräuniger / Flytec', entry: 'brand.brauniger' },
  { key: 'bluefly', name: 'BlueFly', entry: 'brand.bluefly' },
  { key: 'gnuvario', name: 'GNUVario', entry: 'brand.gnuvario' },
  { key: 'leaf', name: 'Leaf', entry: 'brand.leaf' },
  { key: 'xctrack', name: 'XCTrack', entry: 'brand.xctrack' },
  { key: 'seeyou', name: 'SeeYou Navigator', entry: 'brand.seeyou' },
  { key: 'xcsoar', name: 'XCSoar', entry: 'brand.xcsoar' },
  { key: 'flybeeper', name: 'FlyBeeper', entry: 'fb.simple' },
  { key: 'other', name: '', entry: null },
  { key: 'phone', name: '', entry: null },
  { key: 'none', name: '', entry: null },
]

export function instrument(key: string | undefined) {
  return INSTRUMENTS.find((i) => i.key === key)
}

/**
 * How a vario sounds, as knobs: tone, rhythm, beep length, the curve's bend and
 * the sink tone. When it sounds (thresholds, holds, averaging) is not taken:
 * that comes from where the pilot flies. null when there is nothing to start from.
 */
export function soundLike(key: string | undefined): Partial<Knobs> | null {
  const id = instrument(key)?.entry
  const e = (catalog as Entry[]).find((x) => x.id === id)
  if (!e?.curves)
    return null
  const c = e.curves
  const at = (ys: number[], cm: number) => interp(c.varioDots, ys, cm)
  // Read the climb from the vario's own climb start; a sound below zero (its
  // own near-zero tone) is read from +0.1, where its climb beeps are.
  const start = e.trigger && e.trigger.climbOn >= 0 ? e.trigger.climbOn : 0.1
  const lo = Math.round(start * 100) + 1
  const k: Partial<Knobs> = {
    pitchLow: at(c.freqDots, lo),
    pitchHigh: at(c.freqDots, 500),
    tempoLow: at(c.cycleDots, lo),
    tempoHigh: at(c.cycleDots, 500),
    dutyLow: at(c.dutyDots, lo),
    dutyHigh: at(c.dutyDots, 500),
  }
  // The vario's own bend of each curve between its climb start and +5 m/s.
  // Sample where the vario's own curve breaks: its points between the climb
  // start and +5 m/s, thinned to four (the ones a straight line would miss
  // most) or padded at the widest gaps; the fifth is +5 m/s itself.
  const qOf = (v: number) => (v - lo) / (500 - lo)
  let qs = c.varioDots.filter((v) => v > lo + 3 && v < 497).map(qOf)
  const norm = (ys: number[]) => {
    const a = at(ys, lo)
    const b = at(ys, 500)
    return (q: number) => (Math.abs(b - a) < 1 ? q : (at(ys, lo + (500 - lo) * q) - a) / (b - a))
  }
  const nf = norm(c.freqDots)
  const nc = norm(c.cycleDots)
  const miss = (list: number[], i: number) => {
    const x = [0, ...list, 1]
    const j = i + 1
    const t = (x[j]! - x[j - 1]!) / (x[j + 1]! - x[j - 1]!)
    const err = (n: (q: number) => number) => Math.abs(n(x[j]!) - (n(x[j - 1]!) + (n(x[j + 1]!) - n(x[j - 1]!)) * t))
    return err(nf) + err(nc)
  }
  while (qs.length > 4) {
    let worst = 0
    for (let i = 1; i < qs.length; i++) {
      if (miss(qs, i) < miss(qs, worst))
        worst = i
    }
    qs.splice(worst, 1)
  }
  while (qs.length < 4) {
    const x = [0, ...qs, 1]
    let gi = 1
    for (let i = 1; i < x.length; i++) {
      if (x[i]! - x[i - 1]! > x[gi]! - x[gi - 1]!)
        gi = i
    }
    qs = [...qs, (x[gi]! + x[gi - 1]!) / 2].sort((p, q) => p - q)
  }
  const q = [...qs, 1]
  const nd = norm(c.dutyDots)
  k.bend = { q, f: q.map(nf), c: q.map(nc), d: q.map(nd) }
  k.shape = 'linear'
  // The sink tone as this vario plays it at its own alarm.
  const s0 = Math.round((e.trigger?.sinkOn ?? -2.5) * 100) - 1
  k.sinkPitch = at(c.freqDots, s0)
  k.sinkFalls = at(c.freqDots, -600) < k.sinkPitch - 20
  const sd = at(c.dutyDots, s0 - 50)
  const sc = at(c.cycleDots, s0 - 50)
  k.sinkStyle = sd >= 90 ? 'continuous' : sc >= 800 ? 'slow' : 'pulsed'
  return k
}
