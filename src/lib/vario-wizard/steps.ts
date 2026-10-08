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

const WHERE_TEXT: Record<string, string> = {
  mountains: 'mountain flying',
  flatland: 'flatland flying',
  ridge: 'coast and ridge flying',
  comp: 'competitions',
  learning: 'learning',
}

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
    lead: 'This sets when the vario sounds: from what climb, from what sink, how quickly it reacts.',
    options: [
      { key: 'mountains', label: 'Mountains', hint: 'strong, rough thermals', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.2, hold: 0.1, sinkOn: -3, average: 0.5 }) },
      { key: 'flatland', label: 'Flatland', hint: 'weak, broken thermals', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.05, hold: 0.05, nearZero: 'ticks', nearFrom: -0.3, average: 0.3 }) },
      { key: 'ridge', label: 'Coast and ridge', hint: 'dynamic lift', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.2, hold: 0.1, sinkOn: -2, average: 0.4 }) },
      { key: 'comp', label: 'Competitions and XC', hint: 'every second counts', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.1, hold: 0.05, average: 0.15 }) },
      { key: 'learning', label: 'I am learning', hint: 'first thermals', apply: () => ({ ...WHEN_DEFAULT, climbStart: 0.2, hold: 0.1, sinkOn: -2, average: 0.4 }) },
    ],
  },
  {
    key: 'instrument',
    kind: 'info',
    title: 'Which vario sound do you know best?',
    lead: 'The one you fly with, or one you heard on a friend\'s wing and liked. We start from its tone and rhythm.',
    options: INSTRUMENTS.map((i) => ({ key: i.key, label: i.label, apply: () => soundLike(i.key) ?? soundOf(DEFAULT_KNOBS) })),
  },
  {
    key: 'why',
    kind: 'info',
    title: (a) => `Why the ${instrument(a.instrument)?.label}?`,
    options: [
      { key: 'used', label: 'I fly with it, my ears are used to it' },
      { key: 'liked', label: 'I heard it and liked it' },
      { key: 'both', label: 'Both' },
    ],
  },
  {
    key: 'familiar',
    kind: 'listen',
    title: (a) => `Here is a sound close to the ${instrument(a.instrument)?.label}. Is this the one you meant?`,
    lead: (a) => `Its tone and rhythm; it switches on as set for ${WHERE_TEXT[a.where ?? ''] ?? 'your flying'}. Play it: a glide, into a thermal, a few turns, out into sink.`,
    clip: 'flight',
    options: [
      { key: 'yes', label: 'Yes, that is it', hint: 'straight to the result; you can still fine-tune it there' },
      { key: 'tune', label: 'Not quite, let\'s adjust it', hint: 'a few questions by ear, starting from this sound' },
    ],
  },
  {
    key: 'rTempo',
    kind: 'sound',
    title: (a) => `The beeps of the ${instrument(a.instrument)?.label}: faster or slower?`,
    lead: 'The whole climb keeps its shape; only the rhythm moves. The climb grows from 0 to +4 m/s.',
    clip: 'climb',
    options: [
      { key: 'slower', label: 'Slower', hint: 'about a quarter longer between beeps', apply: (k) => ({ tempoLow: k.tempoLow * 1.25, tempoHigh: k.tempoHigh * 1.25 }) },
      { key: 'same', label: 'As it is' },
      { key: 'faster', label: 'Faster', hint: 'about a fifth shorter between beeps', apply: (k) => ({ tempoLow: k.tempoLow * 0.8, tempoHigh: k.tempoHigh * 0.8 }) },
    ],
  },
  {
    key: 'rTone',
    kind: 'sound',
    title: (a) => `The tone of the ${instrument(a.instrument)?.label}: higher or lower?`,
    lead: 'The whole climb keeps its shape; only the tone moves.',
    clip: 'climb',
    options: [
      { key: 'lower', label: 'Lower', hint: 'by about two tones', apply: (k) => ({ pitchLow: k.pitchLow * 0.8, pitchHigh: k.pitchHigh * 0.8 }) },
      { key: 'same', label: 'As it is' },
      { key: 'higher', label: 'Higher', hint: 'by about two tones', apply: (k) => ({ pitchLow: k.pitchLow * 1.25, pitchHigh: k.pitchHigh * 1.25 }) },
    ],
  },
  {
    key: 'rBend',
    kind: 'sound',
    title: 'Where should the sound change most?',
    lead: 'This vario has its own curve. Keep it, or move it a good part of the way towards an even one or towards more detail in weak lift.',
    clip: 'climb',
    options: [
      { key: 'same', label: 'Keep its curve' },
      { key: 'even', label: 'More evenly over the whole climb', apply: (k) => (k.bend ? { bend: blendBend(k.bend, 'linear', 0.6) } : { shape: 'linear' }) },
      { key: 'weak', label: 'More in weak lift, below 1 m/s', apply: (k) => (k.bend ? { bend: blendBend(k.bend, 'weak', 0.6) } : { shape: 'weak' }) },
    ],
  },
  {
    key: 'bSound',
    kind: 'sound',
    title: 'Which of these is easier to follow?',
    lead: 'Three complete sounds on a short thermal: in, a few seconds of climb, out into sink.',
    clip: 'mini',
    options: [
      { key: 'both', label: 'A', hint: 'beeps get both faster and higher', apply: () => ({ tempoLow: 600, tempoHigh: 180, pitchLow: 600, pitchHigh: 1400, dutyLow: 50, dutyHigh: 50, shape: 'linear', bend: undefined }) },
      { key: 'tempo', label: 'B', hint: 'the rhythm tells the climb', apply: () => ({ tempoLow: 700, tempoHigh: 130, pitchLow: 600, pitchHigh: 800, dutyLow: 50, dutyHigh: 50, shape: 'linear', bend: undefined }) },
      { key: 'pitch', label: 'C', hint: 'the tone tells the climb', apply: () => ({ tempoLow: 480, tempoHigh: 400, pitchLow: 550, pitchHigh: 1800, dutyLow: 50, dutyHigh: 50, shape: 'linear', bend: undefined }) },
    ],
  },
  {
    key: 'bStart',
    kind: 'sound',
    title: 'Should it beep in very weak lift?',
    lead: 'The air goes slowly from a small sink into a weak climb.',
    clip: 'start',
    options: [
      { key: 'real', label: 'Only when it really climbs', hint: 'from +0.2 m/s', apply: () => ({ climbStart: 0.2, hold: 0.1, nearZero: 'silent' }) },
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
      { key: 'tempo', label: 'The beeps come faster', hint: 'the tone barely moves', apply: () => ({ tempoLow: 700, tempoHigh: 130, pitchLow: 600, pitchHigh: 800, dutyLow: 50, dutyHigh: 50, bend: undefined }) },
      { key: 'pitch', label: 'The tone goes up', hint: 'the rhythm barely moves', apply: () => ({ tempoLow: 480, tempoHigh: 400, pitchLow: 550, pitchHigh: 1800, dutyLow: 50, dutyHigh: 50, bend: undefined }) },
      { key: 'both', label: 'Both, faster and higher', apply: () => ({ tempoLow: 600, tempoHigh: 180, pitchLow: 600, pitchHigh: 1400, dutyLow: 50, dutyHigh: 50, bend: undefined }) },
      { key: 'long', label: 'The beeps get longer', hint: 'almost a steady tone in a strong core', apply: () => ({ tempoLow: 600, tempoHigh: 200, pitchLow: 600, pitchHigh: 1300, dutyLow: 30, dutyHigh: 85, bend: undefined }) },
    ],
  },
  {
    key: 'detail',
    kind: 'sound',
    title: 'Where do you want to hear small differences?',
    clip: 'climb',
    options: [
      { key: 'weak', label: 'In weak lift, below 1 m/s', hint: 'most of the change happens early', apply: () => ({ shape: 'weak', bend: undefined }) },
      { key: 'even', label: 'Evenly over the whole climb', apply: () => ({ shape: 'linear', bend: undefined }) },
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
    title: 'How many sound profiles would you keep on your vario?',
    lead: 'A sound profile is a whole set: how it beeps and when it switches on.',
    options: [
      { key: 'one', label: 'One profile for every flight' },
      { key: 'sets', label: 'Two or three, for different conditions', hint: 'say mountains, flatland, coast' },
      { key: 'own', label: 'Many: I tune a profile for each site or day' },
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
    explain: 'How often the climb beeps come, at every climb strength. The tone stays.',
    move: (k, d) => ({ tempoLow: k.tempoLow * (d > 0 ? 0.85 : 1.18), tempoHigh: k.tempoHigh * (d > 0 ? 0.85 : 1.18) }),
  },
  {
    key: 'pitch', title: 'Tone', a: 'Lower', b: 'Higher', clip: 'climb',
    explain: 'How high the climb beeps sound: the whole climb moves up or down by about 12 %. The rhythm stays.',
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
