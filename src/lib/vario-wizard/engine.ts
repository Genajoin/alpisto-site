/**
 * How a FlyBeeper decides to beep, ported from the app (flybeeper
 * apps/maps/src/devices/thresholdModel.ts + buzzerLoop.ts), which mirrors the
 * firmware's tone_logic.c line by line. Change it there first.
 *
 * Here it runs offline: given a vario trace, it returns every beep the
 * instrument would play, so the page can schedule them on the audio clock.
 */

export interface Curves {
  /** cm/s, non-decreasing, 12 points. */
  varioDots: number[]
  freqDots: number[]
  cycleDots: number[]
  dutyDots: number[]
}

/** "When it sounds", in device units: m/s and seconds. */
export interface Trigger {
  climbOn: number
  climbOff: number
  sinkOn: number
  sinkOff: number
  hyst: number
  average: number
}

export interface Beep {
  /** Start, s. */
  t: number
  /** Length, s. */
  d: number
  f: number
}

export function interp(xs: number[], ys: number[], x: number): number {
  const n = xs.length
  if (x <= xs[0]!)
    return ys[0]!
  if (x >= xs[n - 1]!)
    return ys[n - 1]!
  for (let i = 1; i < n; i++) {
    if (x <= xs[i]!) {
      const span = xs[i]! - xs[i - 1]!
      if (span === 0)
        return ys[i - 1]!
      return ys[i - 1]! + (ys[i]! - ys[i - 1]!) * (x - xs[i - 1]!) / span
    }
  }
  return ys[n - 1]!
}

export function toneAt(c: Curves, cm: number) {
  return {
    f: interp(c.varioDots, c.freqDots, cm),
    cycle: interp(c.varioDots, c.cycleDots, cm),
    duty: interp(c.varioDots, c.dutyDots, cm),
  }
}

interface Params { climbOn: number, climbOff: number, sinkOn: number, sinkOff: number, hyst: number }

/** soundParams of the model: holds on the wrong side of their ON partner mean "no hold". */
export function paramsOf(t: Trigger): Params {
  const c = (x: number) => Math.round(x * 100)
  const climbOn = c(t.climbOn)
  const sinkOn = c(t.sinkOn)
  const cf = c(t.climbOff) > climbOn ? climbOn : c(t.climbOff)
  let sf = c(t.sinkOff) < sinkOn ? sinkOn : c(t.sinkOff)
  sf = Math.min(sf, Math.max(cf, sinkOn))
  return { climbOn, climbOff: Math.max(cf, sf), sinkOn, sinkOff: sf, hyst: Math.max(0, c(t.hyst)) }
}

type Side = 'climb' | 'sink' | null

function decide(p: Params, prev: Side, v: number, ema: number): Side {
  const weak = p.hyst > 0 && v < ema && ema > p.climbOn
  const onEff = weak ? p.climbOn + p.hyst : p.climbOn
  const offEff = weak ? p.climbOn + p.hyst : p.climbOff
  if (v > onEff)
    return 'climb'
  if (v < p.sinkOn)
    return 'sink'
  if (prev === 'climb' && v > offEff)
    return 'climb'
  if (prev === 'sink' && v < p.sinkOff)
    return 'sink'
  return null
}

const TICK = 40
const SAMPLE = 16

function averageStep(avg: number, input: number, averageMs: number): number {
  const period = averageMs >= SAMPLE && averageMs <= 10000 ? averageMs : 100
  const keep = (1 - SAMPLE / period) ** (TICK / SAMPLE)
  return input + (avg - input) * keep
}

/**
 * Every beep the instrument plays for a vario trace. `air(tMs)` is the vario
 * before the instrument's averaging, cm/s. `track`, if given, receives the
 * averaged vario the instrument works from, one value per 40 ms tick.
 */
export const TICK_MS = TICK

export function simulate(c: Curves, t: Trigger, air: (tMs: number) => number, lenMs: number, track?: number[]): Beep[] {
  const p = paramsOf(t)
  const avgMs = Math.round(t.average * 1000)
  const beeps: Beep[] = []
  let smooth = air(0)
  let v = Math.round(smooth)
  let emaX10 = v * 10
  let side: Side = null
  let phase: 'idle' | 'sample' | 'pause' = 'idle'
  let phaseEnd = 0
  let beepStart = 0
  let beepF = 0

  const endBeep = (now: number) => {
    beeps.push({ t: beepStart / 1000, d: (now - beepStart) / 1000, f: beepF })
  }
  const startSample = (now: number) => {
    const tone = toneAt(c, v)
    const ms = Math.trunc(tone.cycle * tone.duty / 100)
    if (ms <= 0) {
      phase = 'idle'
      return
    }
    beepStart = now
    beepF = tone.f
    phase = 'sample'
    phaseEnd = now + ms
  }
  const startPause = (now: number) => {
    endBeep(now)
    const tone = toneAt(c, v)
    const ms = Math.trunc(tone.cycle * (100 - tone.duty) / 100)
    if (ms <= 0) {
      phase = 'idle'
      return
    }
    phase = 'pause'
    phaseEnd = now + ms
  }

  for (let now = 0; now <= lenMs; now++) {
    if (phase !== 'idle' && now >= phaseEnd) {
      if (phase === 'sample')
        startPause(now)
      else startSample(now)
    }
    if (now % TICK !== 0)
      continue
    smooth = averageStep(smooth, air(now), avgMs)
    v = Math.round(smooth)
    track?.push(v)
    emaX10 = Math.trunc(emaX10 * 9 / 10) + v
    if (phase === 'sample')
      continue
    side = decide(p, side, v, Math.trunc(emaX10 / 10))
    if (side === null)
      phase = 'idle'
    else if (phase === 'idle')
      startSample(now)
  }
  if (phase === 'sample')
    endBeep(lenMs)
  return beeps
}
