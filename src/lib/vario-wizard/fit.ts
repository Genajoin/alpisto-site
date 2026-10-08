/**
 * A familiar sound as wizard knobs: the vario a pilot is used to, read off its
 * twelve-point curve and thresholds (src/data/vario-sound/catalog.json, the
 * FlyBeeper app's list). The wizard keeps working in knobs, so the result is
 * "close to" that vario, and every later answer and fine-tune still applies.
 */
import catalog from '../../data/vario-sound/catalog.json'
import { interp, type Curves } from './engine'
import { tidy, type Knobs } from './generator'

interface Entry {
  id: string
  name: string
  curves?: Curves
  trigger?: { climbOn: number, climbOff: number, sinkOn: number, sinkOff: number, hyst?: number, average?: number }
}

/** What pilots fly with, as they would name it, and the list entry that sounds like it. */
export const INSTRUMENTS: { key: string, label: string, entry: string | null }[] = [
  { key: 'xctracer', label: 'XC Tracer', entry: 'brand.xctracer' },
  { key: 'flymaster', label: 'Flymaster', entry: 'brand.flymaster' },
  { key: 'skytraxx', label: 'Skytraxx', entry: 'brand.skytraxx' },
  { key: 'syride', label: 'Syride', entry: 'brand.syride' },
  { key: 'skydrop', label: 'SkyDrop', entry: 'brand.skydrop' },
  { key: 'brauniger', label: 'Bräuniger / Flytec', entry: 'brand.brauniger' },
  { key: 'bluefly', label: 'BlueFly', entry: 'brand.bluefly' },
  { key: 'gnuvario', label: 'GNUVario', entry: 'brand.gnuvario' },
  { key: 'leaf', label: 'Leaf', entry: 'brand.leaf' },
  { key: 'xctrack', label: 'XCTrack on a phone', entry: 'brand.xctrack' },
  { key: 'seeyou', label: 'SeeYou Navigator on a phone', entry: 'brand.seeyou' },
  { key: 'xcsoar', label: 'XCSoar on a phone', entry: 'brand.xcsoar' },
  { key: 'flybeeper', label: 'FlyBeeper', entry: 'fb.simple' },
  { key: 'other', label: 'Another vario', entry: null },
  { key: 'phone', label: 'A phone without a vario sensor', entry: null },
  { key: 'none', label: 'Nothing yet', entry: null },
]

export function instrument(key: string | undefined) {
  return INSTRUMENTS.find((i) => i.key === key)
}

const r2 = (x: number) => Math.round(x * 100) / 100

/** Knobs that sound close to an instrument; null when there is nothing to start from. */
export function knobsLike(key: string | undefined, base: Knobs): Knobs | null {
  const id = instrument(key)?.entry
  const e = (catalog as Entry[]).find((x) => x.id === id)
  if (!e?.curves)
    return null
  const c = e.curves
  const at = (ys: number[], cm: number) => interp(c.varioDots, ys, cm)
  const t = e.trigger
  const k: Knobs = { ...base }

  if (t) {
    if (t.climbOn < 0) {
      // A sound below zero: a near-zero tone of its own, climb beeps from +0.1.
      k.nearZero = 'tone'
      k.nearFrom = r2(t.climbOn)
      k.climbStart = 0.1
      k.hold = 0
    }
    else {
      k.nearZero = 'silent'
      k.climbStart = r2(t.climbOn)
      k.hold = r2(Math.max(0, t.climbOn - Math.min(t.climbOff, t.climbOn)))
    }
    k.sinkOn = r2(t.sinkOn)
    k.sinkHold = r2(Math.max(0, t.sinkOff - t.sinkOn))
    if (t.average !== undefined)
      k.average = t.average
  }

  const lo = Math.round(k.climbStart * 100) + 1
  k.pitchLow = at(c.freqDots, lo)
  k.pitchHigh = at(c.freqDots, 500)
  k.tempoLow = at(c.cycleDots, lo)
  k.tempoHigh = at(c.cycleDots, 500)
  k.dutyLow = at(c.dutyDots, lo)
  k.dutyHigh = at(c.dutyDots, 500)
  // Weak-lift emphasis: more than a third of the pitch change already by +1 m/s.
  const span = k.pitchHigh - k.pitchLow
  const u = span > 0 ? (at(c.freqDots, 100) - k.pitchLow) / span : 0
  k.shape = u > 0.35 ? 'weak' : 'linear'

  const s0 = Math.round(k.sinkOn * 100) - 1
  k.sinkPitch = at(c.freqDots, s0)
  k.sinkFalls = at(c.freqDots, -600) < k.sinkPitch - 20
  const sd = at(c.dutyDots, s0 - 50)
  const sc = at(c.cycleDots, s0 - 50)
  k.sinkStyle = sd >= 90 ? 'continuous' : sc >= 800 ? 'slow' : 'pulsed'
  return tidy(k)
}
