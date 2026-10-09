/**
 * The questions. Each answer moves knobs of the generator; answers are kept
 * as they are, too, so the same page can later count them for everyone.
 */
import type { ClipKey } from './scenarios'
import { DEFAULT_KNOBS, blendBend, type Knobs } from './generator'
import { INSTRUMENTS, instrument, soundLike } from './fit'

export type Answers = Record<string, string>

/** "When it sounds" knobs, the part that comes from where a pilot flies. */
const WHEN_DEFAULT: Partial<Knobs> = {
  climbStart: DEFAULT_KNOBS.climbStart,
  hold: DEFAULT_KNOBS.hold,
  nearZero: 'silent',
  nearFrom: DEFAULT_KNOBS.nearFrom,
  sinkOn: DEFAULT_KNOBS.sinkOn,
  sinkHold: DEFAULT_KNOBS.sinkHold,
  average: DEFAULT_KNOBS.average,
}

/** "How it sounds" knobs, the part a familiar vario gives. */
function soundOf(k: Knobs): Partial<Knobs> {
  const { pitchLow, pitchHigh, tempoLow, tempoHigh, dutyLow, dutyHigh, shape, sinkPitch, sinkFalls, sinkStyle } = k
  return { pitchLow, pitchHigh, tempoLow, tempoHigh, dutyLow, dutyHigh, shape, sinkPitch, sinkFalls, sinkStyle }
}

/** Labels, hints, titles and leads live in i18n/<lang>.ts under the same keys. */
export interface Option {
  key: string
  /** What this answer does to the sound; absent = the answer is only recorded. */
  apply?: (k: Knobs, a: Answers) => Partial<Knobs>
}

/**
 * sound  — each answer can be shown and played before it is chosen;
 * listen — one sound to play, the answers only judge it;
 * info   — a quick answer, no sound (multi: several at once);
 * text   — a line of free text.
 */
export type StepKind = 'sound' | 'listen' | 'info' | 'text'

export interface Step {
  key: string
  kind: StepKind
  multi?: boolean
  /** Optional steps say so and offer to skip to the result. */
  optional?: boolean
  /** The clip each option plays; absent = nothing to listen to. */
  clip?: ClipKey
  options: Option[]
}

export const STEPS: Step[] = [
  {
    key: 'years',
    kind: 'info',
    options: [
      { key: '0' },
      { key: '1-2' },
      { key: '3-5' },
      { key: '6-10' },
      { key: '10+' },
    ],
  },
  {
    key: 'where',
    kind: 'info',
    options: [
      { key: 'mountains', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.2, hold: 0.1, sinkOn: -3, average: 0.5 }) },
      { key: 'flatland', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.05, hold: 0.05, nearZero: 'ticks', nearFrom: -0.3, average: 0.3 }) },
      { key: 'ridge', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.2, hold: 0.1, sinkOn: -2, average: 0.4 }) },
      { key: 'comp', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.1, hold: 0.05, average: 0.15 }) },
      { key: 'learning', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.2, hold: 0.1, sinkOn: -2, average: 0.4 }) },
    ],
  },
  {
    key: 'instrument',
    kind: 'info',
    options: INSTRUMENTS.map((i) => ({ key: i.key, apply: () => soundLike(i.key) ?? soundOf(DEFAULT_KNOBS) })),
  },
  {
    key: 'why',
    kind: 'info',
    options: [
      { key: 'used' },
      { key: 'liked' },
      { key: 'both' },
    ],
  },
  {
    key: 'familiar',
    kind: 'listen',
    clip: 'flight',
    options: [
      { key: 'yes' },
      { key: 'tune' },
    ],
  },
  {
    key: 'rTempo',
    kind: 'sound',
    clip: 'climb',
    options: [
      { key: 'slower', apply: (k) => ({ tempoLow: k.tempoLow * 1.25, tempoHigh: k.tempoHigh * 1.25 }) },
      { key: 'same' },
      { key: 'faster', apply: (k) => ({ tempoLow: k.tempoLow * 0.8, tempoHigh: k.tempoHigh * 0.8 }) },
    ],
  },
  {
    key: 'rTone',
    kind: 'sound',
    clip: 'climb',
    options: [
      { key: 'lower', apply: (k) => ({ pitchLow: k.pitchLow * 0.8, pitchHigh: k.pitchHigh * 0.8 }) },
      { key: 'same' },
      { key: 'higher', apply: (k) => ({ pitchLow: k.pitchLow * 1.25, pitchHigh: k.pitchHigh * 1.25 }) },
    ],
  },
  {
    key: 'rBend',
    kind: 'sound',
    clip: 'climb',
    options: [
      { key: 'same' },
      { key: 'even', apply: (k) => (k.bend ? { bend: blendBend(k.bend, 'linear', 0.6) } : { shape: 'linear' }) },
      { key: 'weak', apply: (k) => (k.bend ? { bend: blendBend(k.bend, 'weak', 0.6) } : { shape: 'weak' }) },
    ],
  },
  {
    key: 'bSound',
    kind: 'sound',
    clip: 'mini',
    options: [
      { key: 'both', apply: () => ({ tempoLow: 600, tempoHigh: 180, pitchLow: 600, pitchHigh: 1400, dutyLow: 50, dutyHigh: 50, shape: 'linear', bend: undefined }) },
      { key: 'tempo', apply: () => ({ tempoLow: 700, tempoHigh: 130, pitchLow: 600, pitchHigh: 800, dutyLow: 50, dutyHigh: 50, shape: 'linear', bend: undefined }) },
      { key: 'pitch', apply: () => ({ tempoLow: 480, tempoHigh: 400, pitchLow: 550, pitchHigh: 1800, dutyLow: 50, dutyHigh: 50, shape: 'linear', bend: undefined }) },
    ],
  },
  {
    key: 'bStart',
    kind: 'sound',
    clip: 'start',
    options: [
      { key: 'real', apply: () => ({ climbStart: 0.2, hold: 0.1, nearZero: 'silent' }) },
      { key: 'any', apply: () => ({ climbStart: 0.05, hold: 0.05 }) },
    ],
  },
  {
    key: 'bSink',
    kind: 'sound',
    clip: 'sink',
    options: [
      { key: 'early', apply: () => ({ sinkOn: -2, sinkHold: 0.3, sinkStyle: 'continuous', sinkFalls: true }) },
      { key: 'late', apply: () => ({ sinkOn: -3, sinkHold: 0.3, sinkStyle: 'continuous', sinkFalls: true }) },
      { key: 'never', apply: () => ({ sinkOn: -10 }) },
    ],
  },
  {
    key: 'growth',
    kind: 'sound',
    clip: 'climb',
    options: [
      { key: 'tempo', apply: () => ({ tempoLow: 700, tempoHigh: 130, pitchLow: 600, pitchHigh: 800, dutyLow: 50, dutyHigh: 50, bend: undefined }) },
      { key: 'pitch', apply: () => ({ tempoLow: 480, tempoHigh: 400, pitchLow: 550, pitchHigh: 1800, dutyLow: 50, dutyHigh: 50, bend: undefined }) },
      { key: 'both', apply: () => ({ tempoLow: 600, tempoHigh: 180, pitchLow: 600, pitchHigh: 1400, dutyLow: 50, dutyHigh: 50, bend: undefined }) },
      { key: 'long', apply: () => ({ tempoLow: 600, tempoHigh: 200, pitchLow: 600, pitchHigh: 1300, dutyLow: 30, dutyHigh: 85, bend: undefined }) },
    ],
  },
  {
    key: 'detail',
    kind: 'sound',
    clip: 'climb',
    options: [
      { key: 'weak', apply: () => ({ shape: 'weak', bend: undefined }) },
      { key: 'even', apply: () => ({ shape: 'linear', bend: undefined }) },
    ],
  },
  {
    key: 'top',
    kind: 'sound',
    clip: 'climb',
    options: [
      { key: 'soft', apply: (k) => ({ pitchHigh: k.pitchLow + (k.pitchHigh - k.pitchLow) * 0.6 }) },
      { key: 'medium', apply: () => ({}) },
      { key: 'high', apply: (k) => ({ pitchHigh: k.pitchLow + (k.pitchHigh - k.pitchLow) * 1.5 }) },
    ],
  },
  {
    key: 'start',
    kind: 'sound',
    clip: 'start',
    options: [
      { key: '0', apply: () => ({ climbStart: 0 }) },
      { key: '0.1', apply: () => ({ climbStart: 0.1 }) },
      { key: '0.2', apply: () => ({ climbStart: 0.2 }) },
      { key: '0.3', apply: () => ({ climbStart: 0.3 }) },
    ],
  },
  {
    key: 'fade',
    kind: 'sound',
    clip: 'fade',
    options: [
      { key: 'same', apply: () => ({ hold: 0 }) },
      { key: 'hold', apply: () => ({ hold: 0.1 }) },
      { key: 'early', apply: (k) => ({ climbStart: k.climbStart + 0.1, hold: 0 }) },
      { key: 'below', apply: (k) => ({ nearZero: k.nearZero === 'silent' ? 'tone' : k.nearZero, nearFrom: -0.4 }) },
    ],
  },
  {
    key: 'near',
    kind: 'sound',
    clip: 'near',
    options: [
      { key: 'silent', apply: () => ({ nearZero: 'silent' }) },
      { key: 'ticks', apply: (k) => ({ nearZero: 'ticks', nearFrom: Math.min(k.nearFrom, -0.4) }) },
      { key: 'tone', apply: (k) => ({ nearZero: 'tone', nearFrom: Math.min(k.nearFrom, -0.4) }) },
      { key: 'early', apply: () => ({ nearZero: 'tone', nearFrom: -1 }) },
    ],
  },
  {
    key: 'sinkFrom',
    kind: 'sound',
    clip: 'sink',
    options: [
      { key: '-1.5', apply: () => ({ sinkOn: -1.5 }) },
      { key: '-2', apply: () => ({ sinkOn: -2 }) },
      { key: '-2.5', apply: () => ({ sinkOn: -2.5 }) },
      { key: '-3', apply: () => ({ sinkOn: -3 }) },
      { key: '-4', apply: () => ({ sinkOn: -4 }) },
      { key: 'never', apply: () => ({ sinkOn: -10 }) },
    ],
  },
  {
    key: 'sinkHold',
    kind: 'sound',
    clip: 'sink',
    options: [
      { key: 'same', apply: () => ({ sinkHold: 0 }) },
      { key: 'little', apply: () => ({ sinkHold: 0.3 }) },
      { key: 'more', apply: () => ({ sinkHold: 0.6 }) },
    ],
  },
  {
    key: 'sinkStyle',
    kind: 'sound',
    clip: 'sink',
    options: [
      { key: 'falling', apply: () => ({ sinkStyle: 'continuous', sinkFalls: true }) },
      { key: 'flat', apply: () => ({ sinkStyle: 'continuous', sinkFalls: false }) },
      { key: 'pulsed', apply: () => ({ sinkStyle: 'pulsed', sinkFalls: true }) },
      { key: 'slow', apply: () => ({ sinkStyle: 'slow', sinkFalls: true }) },
    ],
  },
  {
    key: 'reaction',
    kind: 'sound',
    clip: 'bumpy',
    options: [
      { key: 'quick', apply: () => ({ average: 0.1 }) },
      { key: 'balanced', apply: () => ({ average: 0.3 }) },
      { key: 'calm', apply: () => ({ average: 0.6 }) },
    ],
  },
  {
    key: 'volume',
    kind: 'info',
    optional: true,
    options: [
      { key: 'constant' },
      { key: 'climb' },
      { key: 'wind' },
      { key: 'sink' },
    ],
  },
  {
    key: 'sets',
    kind: 'info',
    optional: true,
    options: [
      { key: 'one' },
      { key: 'sets' },
      { key: 'own' },
    ],
  },
  {
    key: 'hear',
    kind: 'info',
    multi: true,
    optional: true,
    options: [
      { key: 'instrument' },
      { key: 'phone' },
      { key: 'headset' },
    ],
  },
  {
    key: 'annoy',
    kind: 'text',
    optional: true,
    // Two free-text fields, each kept under its own key: the vario's sound, and this wizard.
    options: [{ key: 'annoy' }, { key: 'wizard' }],
  },
]

const TUNE = ['growth', 'detail', 'top', 'start', 'fade', 'near', 'sinkFrom', 'sinkHold', 'sinkStyle', 'reaction']
/** The full path's questions that set tone and rhythm from scratch. */
const SOUND_STEPS = ['growth', 'detail', 'top']
const FINAL = ['volume', 'sets', 'hear', 'annoy']

export function isBeginner(a: Answers): boolean {
  return a.years === '0' || a.years === '1-2' || a.where === 'learning'
}

/** The questions for these answers, in order; it grows as the answers come. */
export function flow(a: Answers): string[] {
  const out = ['years', 'instrument']
  const known = !!instrument(a.instrument)?.entry
  if (known)
    out.push('why')
  out.push('where')
  if (known)
    out.push('familiar')
  const adjust = known && a.familiar === 'tune'
  if (isBeginner(a)) {
    // A beginner who knows a sound starts from it; one who does not picks one by ear.
    if (adjust)
      out.push('rTempo', 'rTone')
    else if (!known)
      out.push('bSound')
    out.push('bStart', 'bSink')
  }
  else if (adjust) {
    // From a familiar vario: its tone, rhythm and curve are moved, not replaced.
    out.push('rTempo', 'rTone', 'rBend', ...TUNE.filter((k) => !SOUND_STEPS.includes(k)))
  }
  else if (!known) {
    out.push(...TUNE)
  }
  out.push(...FINAL)
  return out
}

export function stepByKey(key: string): Step {
  return STEPS.find((s) => s.key === key)!
}

/** Fine-tuning on the result: one knob, a step either way, applied at once. */
export interface Refine {
  key: string
  clip: ClipKey
  move: (k: Knobs, dir: -1 | 1) => Partial<Knobs>
}

export const REFINES: Refine[] = [
  {
    key: 'tempo', clip: 'climb',
    move: (k, d) => ({ tempoLow: k.tempoLow * (d > 0 ? 0.85 : 1.18), tempoHigh: k.tempoHigh * (d > 0 ? 0.85 : 1.18) }),
  },
  {
    key: 'pitch', clip: 'climb',
    move: (k, d) => ({ pitchLow: k.pitchLow * (d > 0 ? 1.12 : 0.89), pitchHigh: k.pitchHigh * (d > 0 ? 1.12 : 0.89) }),
  },
  {
    key: 'start', clip: 'start',
    move: (k, d) => ({ climbStart: k.climbStart + (d > 0 ? 0.05 : -0.05) }),
  },
  {
    key: 'react', clip: 'bumpy',
    move: (k, d) => ({ average: k.average * (d > 0 ? 1.5 : 0.67) }),
  },
]
