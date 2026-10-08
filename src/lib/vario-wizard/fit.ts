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
  // Weak-lift emphasis: more than a third of the tone change already by +1 m/s.
  const span = k.pitchHigh! - k.pitchLow!
  const u = span > 0 ? (at(c.freqDots, 100) - k.pitchLow!) / span : 0
  k.shape = u > 0.35 ? 'weak' : 'linear'
  // The sink tone as this vario plays it at its own alarm.
  const s0 = Math.round((e.trigger?.sinkOn ?? -2.5) * 100) - 1
  k.sinkPitch = at(c.freqDots, s0)
  k.sinkFalls = at(c.freqDots, -600) < k.sinkPitch - 20
  const sd = at(c.dutyDots, s0 - 50)
  const sc = at(c.cycleDots, s0 - 50)
  k.sinkStyle = sd >= 90 ? 'continuous' : sc >= 800 ? 'slow' : 'pulsed'
  return k
}
