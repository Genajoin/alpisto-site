/**
 * The questions. Each answer moves knobs of the generator; answers are kept
 * as they are, too, so the same page can later count them for everyone.
 */
import type { ClipKey } from './scenarios'
import { DEFAULT_KNOBS, type Knobs } from './generator'
import { INSTRUMENTS, instrument, knobsLike } from './fit'

export type Answers = Record<string, string>

export interface Option {
  key: string
  label: string
  hint?: string
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
  title: string | ((a: Answers) => string)
  lead?: string | ((a: Answers) => string)
  /** The clip each option plays; absent = nothing to listen to. */
  clip?: ClipKey
  options: Option[]
}

export const STEPS: Step[] = [
  {
    key: 'years',
    kind: 'info',
    title: 'How long have you been flying?',
    lead: 'A few quick questions first, to pick the shortest way to your sound.',
    options: [
      { key: '0', label: 'Less than a year' },
      { key: '1-2', label: '1 to 2 years' },
      { key: '3-5', label: '3 to 5 years' },
      { key: '6-10', label: '6 to 10 years' },
      { key: '10+', label: 'More than 10 years' },
    ],
  },
  {
    key: 'where',
    kind: 'info',
    title: 'Where do you fly most?',
    options: [
      { key: 'mountains', label: 'Mountains', hint: 'strong, rough thermals', apply: () => ({ climbStart: 0.2, hold: 0.1, sinkOn: -3, average: 0.5 }) },
      { key: 'flatland', label: 'Flatland', hint: 'weak, broken thermals', apply: () => ({ climbStart: 0.05, hold: 0.05, nearZero: 'ticks', nearFrom: -0.3, average: 0.3 }) },
      { key: 'ridge', label: 'Coast and ridge', hint: 'dynamic lift', apply: () => ({ climbStart: 0.2, hold: 0.1, sinkOn: -2, average: 0.4 }) },
      { key: 'comp', label: 'Competitions and XC', hint: 'every second counts', apply: () => ({ climbStart: 0.1, hold: 0.05, average: 0.15 }) },
      { key: 'learning', label: 'I am learning', hint: 'first thermals', apply: () => ({ climbStart: 0.2, hold: 0.1, sinkOn: -2, average: 0.4 }) },
    ],
  },
  {
    key: 'instrument',
    kind: 'info',
    title: 'What do you fly with now?',
    lead: 'The vario whose sound you are used to.',
    options: INSTRUMENTS.map((i) => ({ key: i.key, label: i.label })),
  },
  {
    key: 'happy',
    kind: 'info',
    title: (a) => `Do you like how your ${instrument(a.instrument)?.label ?? 'vario'} sounds?`,
    options: [
      { key: 'yes', label: 'Yes, I like it', apply: (k, a) => knobsLike(a.instrument, k) ?? {} },
      { key: 'mostly', label: 'Mostly, I would change a thing or two', apply: (k, a) => knobsLike(a.instrument, k) ?? {} },
      { key: 'no', label: 'No' },
    ],
  },
  {
    key: 'familiar',
    kind: 'listen',
    title: (a) => `Here is a sound close to your ${instrument(a.instrument)?.label}. Is this what you are used to?`,
    lead: 'Play it: a glide, into a thermal, a few turns, out into sink.',
    clip: 'flight',
    options: [
      { key: 'yes', label: 'Yes, that is it' },
      { key: 'adjust', label: 'Close; I will adjust it at the end' },
      { key: 'no', label: 'No, let me build my own', apply: (_k, a) => fromWhere(a) },
    ],
  },
  {
    key: 'bSound',
    kind: 'sound',
    title: 'Which of these is easier to follow?',
    lead: 'Three complete sounds on a short thermal: in, a few seconds of climb, out into sink.',
    clip: 'mini',
    options: [
      { key: 'both', label: 'A', hint: 'beeps get both faster and higher', apply: () => ({ tempoLow: 600, tempoHigh: 180, pitchLow: 600, pitchHigh: 1400, dutyLow: 50, dutyHigh: 50, shape: 'linear', nearZero: 'silent', average: 0.4 }) },
      { key: 'tempo', label: 'B', hint: 'the rhythm tells the climb', apply: () => ({ tempoLow: 700, tempoHigh: 130, pitchLow: 600, pitchHigh: 800, dutyLow: 50, dutyHigh: 50, shape: 'linear', nearZero: 'silent', average: 0.4 }) },
      { key: 'pitch', label: 'C', hint: 'the pitch tells the climb', apply: () => ({ tempoLow: 480, tempoHigh: 400, pitchLow: 550, pitchHigh: 1800, dutyLow: 50, dutyHigh: 50, shape: 'linear', nearZero: 'silent', average: 0.4 }) },
    ],
  },
  {
    key: 'bStart',
    kind: 'sound',
    title: 'Should it beep in very weak lift?',
    lead: 'The air goes slowly from a small sink into a weak climb.',
    clip: 'start',
    options: [
      { key: 'real', label: 'Only when it really climbs', hint: 'from +0.2 m/s', apply: () => ({ climbStart: 0.2, hold: 0.1 }) },
      { key: 'any', label: 'At every bit of lift', hint: 'from +0.05 m/s', apply: () => ({ climbStart: 0.05, hold: 0.05 }) },
    ],
  },
  {
    key: 'bSink',
    kind: 'sound',
    title: 'Do you want a sink alarm?',
    clip: 'sink',
    options: [
      { key: 'early', label: 'Yes, warn me early', hint: 'from −2 m/s', apply: () => ({ sinkOn: -2, sinkHold: 0.3, sinkStyle: 'continuous', sinkFalls: true }) },
      { key: 'late', label: 'Only in strong sink', hint: 'from −3 m/s', apply: () => ({ sinkOn: -3, sinkHold: 0.3, sinkStyle: 'continuous', sinkFalls: true }) },
      { key: 'never', label: 'No sink alarm', apply: () => ({ sinkOn: -10 }) },
    ],
  },
  {
    key: 'growth',
    kind: 'sound',
    title: 'As the climb gets stronger, what should change?',
    lead: 'Listen to each: the climb grows from zero to +4 m/s.',
    clip: 'climb',
    options: [
      { key: 'tempo', label: 'The beeps come faster', hint: 'the pitch barely moves', apply: () => ({ tempoLow: 700, tempoHigh: 130, pitchLow: 600, pitchHigh: 800, dutyLow: 50, dutyHigh: 50 }) },
      { key: 'pitch', label: 'The pitch goes up', hint: 'the rhythm barely moves', apply: () => ({ tempoLow: 480, tempoHigh: 400, pitchLow: 550, pitchHigh: 1800, dutyLow: 50, dutyHigh: 50 }) },
      { key: 'both', label: 'Both, faster and higher', apply: () => ({ tempoLow: 600, tempoHigh: 180, pitchLow: 600, pitchHigh: 1400, dutyLow: 50, dutyHigh: 50 }) },
      { key: 'long', label: 'The beeps get longer', hint: 'almost a steady tone in a strong core', apply: () => ({ tempoLow: 600, tempoHigh: 200, pitchLow: 600, pitchHigh: 1300, dutyLow: 30, dutyHigh: 85 }) },
    ],
  },
  {
    key: 'detail',
    kind: 'sound',
    title: 'Where do you want to hear small differences?',
    clip: 'climb',
    options: [
      { key: 'weak', label: 'In weak lift, below 1 m/s', hint: 'most of the change happens early', apply: () => ({ shape: 'weak' }) },
      { key: 'even', label: 'Evenly over the whole climb', apply: () => ({ shape: 'linear' }) },
    ],
  },
  {
    key: 'top',
    kind: 'sound',
    title: 'How high should a strong climb sound?',
    clip: 'climb',
    options: [
      { key: 'soft', label: 'Low and soft', apply: (k) => ({ pitchHigh: k.pitchLow + (k.pitchHigh - k.pitchLow) * 0.6 }) },
      { key: 'medium', label: 'In between', apply: () => ({}) },
      { key: 'high', label: 'High, to cut through the wind', apply: (k) => ({ pitchHigh: k.pitchLow + (k.pitchHigh - k.pitchLow) * 1.5 }) },
    ],
  },
  {
    key: 'start',
    kind: 'sound',
    title: 'From what climb should it start beeping?',
    lead: 'The air goes slowly from a small sink into a weak climb.',
    clip: 'start',
    options: [
      { key: '0', label: 'From zero', apply: () => ({ climbStart: 0 }) },
      { key: '0.1', label: 'From +0.1 m/s', apply: () => ({ climbStart: 0.1 }) },
      { key: '0.2', label: 'From +0.2 m/s', apply: () => ({ climbStart: 0.2 }) },
      { key: '0.3', label: 'From +0.3 m/s', apply: () => ({ climbStart: 0.3 }) },
    ],
  },
  {
    key: 'fade',
    kind: 'sound',
    title: 'The climb fades to zero. What should the vario do?',
    lead: 'A +1.5 climb weakens in bumpy air.',
    clip: 'fade',
    options: [
      { key: 'same', label: 'Stop where it started', apply: () => ({ hold: 0 }) },
      { key: 'hold', label: 'Hold on a little lower', hint: 'so it does not chatter on bumps', apply: () => ({ hold: 0.1 }) },
      { key: 'early', label: 'Stop a little early', hint: 'a cue that you are leaving the core', apply: (k) => ({ climbStart: k.climbStart + 0.1, hold: 0 }) },
      { key: 'below', label: 'Keep going below zero with another sound', hint: 'to centre weak lift', apply: (k) => ({ nearZero: k.nearZero === 'silent' ? 'tone' : k.nearZero, nearFrom: -0.4 }) },
    ],
  },
  {
    key: 'near',
    kind: 'sound',
    title: 'The air rises, but slower than you sink. What then?',
    lead: 'Gliding, the sink eases off to a small minus before the first weak lift.',
    clip: 'near',
    options: [
      { key: 'silent', label: 'Silence until it climbs', apply: () => ({ nearZero: 'silent' }) },
      { key: 'ticks', label: 'Rare quiet ticks', apply: (k) => ({ nearZero: 'ticks', nearFrom: Math.min(k.nearFrom, -0.4) }) },
      { key: 'tone', label: 'A soft sound of its own', apply: (k) => ({ nearZero: 'tone', nearFrom: Math.min(k.nearFrom, -0.4) }) },
      { key: 'early', label: 'Start early, from −1 m/s', hint: 'hear the air improve before the lift', apply: () => ({ nearZero: 'tone', nearFrom: -1 }) },
    ],
  },
  {
    key: 'sinkFrom',
    kind: 'sound',
    title: 'Sinking deeper and deeper: from what sink should the alarm switch on?',
    lead: 'The clip goes down into −4.5 m/s and back out.',
    clip: 'sink',
    options: [
      { key: '-1.5', label: 'From −1.5 m/s', apply: () => ({ sinkOn: -1.5 }) },
      { key: '-2', label: 'From −2', apply: () => ({ sinkOn: -2 }) },
      { key: '-2.5', label: 'From −2.5', apply: () => ({ sinkOn: -2.5 }) },
      { key: '-3', label: 'From −3', apply: () => ({ sinkOn: -3 }) },
      { key: '-4', label: 'From −4', apply: () => ({ sinkOn: -4 }) },
      { key: 'never', label: 'Never', apply: () => ({ sinkOn: -10 }) },
    ],
  },
  {
    key: 'sinkHold',
    kind: 'sound',
    title: 'The sink eases off again: when should the alarm stop?',
    lead: 'Stopping a little later keeps it from flickering on and off at the edge.',
    clip: 'sink',
    options: [
      { key: 'same', label: 'At the same value it started', apply: () => ({ sinkHold: 0 }) },
      { key: 'little', label: 'A little later, 0.3 m/s weaker', apply: () => ({ sinkHold: 0.3 }) },
      { key: 'more', label: 'Later, 0.6 m/s weaker', apply: () => ({ sinkHold: 0.6 }) },
    ],
  },
  {
    key: 'sinkStyle',
    kind: 'sound',
    title: 'How should the sink alarm sound?',
    clip: 'sink',
    options: [
      { key: 'falling', label: 'A steady low tone that drops with the sink', apply: () => ({ sinkStyle: 'continuous', sinkFalls: true }) },
      { key: 'flat', label: 'A steady low tone, always the same', apply: () => ({ sinkStyle: 'continuous', sinkFalls: false }) },
      { key: 'pulsed', label: 'A pulsing low tone', apply: () => ({ sinkStyle: 'pulsed', sinkFalls: true }) },
      { key: 'slow', label: 'One short beep a second', apply: () => ({ sinkStyle: 'slow', sinkFalls: true }) },
    ],
  },
  {
    key: 'reaction',
    kind: 'sound',
    title: 'Quick or calm?',
    lead: 'A +1.5 thermal in rough air.',
    clip: 'bumpy',
    options: [
      { key: 'quick', label: 'Instant, even with extra beeps in rough air', apply: () => ({ average: 0.1 }) },
      { key: 'balanced', label: 'In between', apply: () => ({ average: 0.3 }) },
      { key: 'calm', label: 'Calm, about half a second behind', apply: () => ({ average: 0.6 }) },
    ],
  },
  {
    key: 'volume',
    kind: 'info',
    optional: true,
    title: 'How should the volume behave?',
    options: [
      { key: 'constant', label: 'Always the same, at the level I set', hint: 'as on most varios today' },
      { key: 'climb', label: 'Louder in a stronger climb' },
      { key: 'wind', label: 'Louder when the wind is louder' },
      { key: 'sink', label: 'Quieter in sink than in lift' },
    ],
  },
  {
    key: 'sets',
    kind: 'info',
    optional: true,
    title: 'How many sounds would you use?',
    options: [
      { key: 'one', label: 'One for everything' },
      { key: 'sets', label: 'Two or three, for different conditions' },
      { key: 'own', label: 'I build my own for each situation' },
    ],
  },
  {
    key: 'hear',
    kind: 'info',
    multi: true,
    optional: true,
    title: 'Where do you want to hear the vario?',
    lead: 'Pick all that apply.',
    options: [
      { key: 'instrument', label: 'On the instrument' },
      { key: 'phone', label: 'On the phone speaker' },
      { key: 'headset', label: 'In earphones or a helmet headset' },
    ],
  },
  {
    key: 'annoy',
    kind: 'text',
    optional: true,
    title: 'What annoys you in the sound of your vario?',
    lead: 'One line is enough.',
    options: [],
  },
]

const TUNE = ['growth', 'detail', 'top', 'start', 'fade', 'near', 'sinkFrom', 'sinkHold', 'sinkStyle', 'reaction']
const BEGINNER = ['bSound', 'bStart', 'bSink']
const FINAL = ['volume', 'sets', 'hear', 'annoy']

/** The starting sound for where a pilot flies, without anything a familiar vario added. */
function fromWhere(a: Answers): Knobs {
  const o = STEPS.find((x) => x.key === 'where')!.options.find((x) => x.key === a.where)
  return { ...DEFAULT_KNOBS, ...(o?.apply?.(DEFAULT_KNOBS, a) ?? {}) }
}

export function isBeginner(a: Answers): boolean {
  return a.years === '0' || a.years === '1-2' || a.where === 'learning'
}

/** The questions for these answers, in order; it grows as the answers come. */
export function flow(a: Answers): string[] {
  const out = ['years', 'where', 'instrument']
  const inst = instrument(a.instrument)
  if (a.instrument && a.instrument !== 'none' && a.instrument !== 'phone')
    out.push('happy')
  if (isBeginner(a)) {
    out.push(...BEGINNER)
  }
  else if (inst?.entry && (a.happy === 'yes' || a.happy === 'mostly')) {
    out.push('familiar')
    if (a.familiar === 'no')
      out.push(...TUNE)
  }
  else {
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
  title: string
  /** What changes, in plain words. */
  explain: string
  a: string
  b: string
  clip: ClipKey
  move: (k: Knobs, dir: -1 | 1) => Partial<Knobs>
}

export const REFINES: Refine[] = [
  {
    key: 'tempo', title: 'Beep rhythm', a: 'Slower', b: 'Faster', clip: 'climb',
    explain: 'How often the climb beeps come, at every climb strength. The pitch stays.',
    move: (k, d) => ({ tempoLow: k.tempoLow * (d > 0 ? 0.85 : 1.18), tempoHigh: k.tempoHigh * (d > 0 ? 0.85 : 1.18) }),
  },
  {
    key: 'pitch', title: 'Pitch', a: 'Lower', b: 'Higher', clip: 'climb',
    explain: 'The whole climb tone moves up or down by about a tone. The rhythm stays.',
    move: (k, d) => ({ pitchLow: k.pitchLow * (d > 0 ? 1.12 : 0.89), pitchHigh: k.pitchHigh * (d > 0 ? 1.12 : 0.89) }),
  },
  {
    key: 'start', title: 'Climb tone starts', a: 'Earlier', b: 'Later', clip: 'start',
    explain: 'How much climb it takes before the first beep, in steps of 0.05 m/s.',
    move: (k, d) => ({ climbStart: k.climbStart + (d > 0 ? 0.05 : -0.05) }),
  },
  {
    key: 'react', title: 'Reaction', a: 'Quicker', b: 'Calmer', clip: 'bumpy',
    explain: 'How closely the sound follows the air. Quicker hears a thermal sooner, with more stray beeps in rough air.',
    move: (k, d) => ({ average: k.average * (d > 0 ? 1.5 : 0.67) }),
  },
]
