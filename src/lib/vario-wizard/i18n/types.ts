/**
 * The wizard's words, one file per language. Logic (steps.ts, generator) keeps
 * only keys; every line a pilot reads comes from here. Placeholders in braces
 * ({v}, {n}, …) are filled by fmt().
 */
import type { ClipKey } from '../scenarios'

export const LANGS = ['en', 'de', 'fr', 'it', 'ru', 'sl'] as const
export type Lang = typeof LANGS[number]

/** Option text: a label, or a label and a hint under it. */
export type OptText = string | [string, string]

export interface StepText {
  /** Title; {vario} = the vario a pilot named. */
  t: string
  /** Lead under the title; {where} = where the pilot flies, in words. */
  l?: string
  o?: Record<string, OptText>
}

export interface Dict {
  lang: Lang
  /** Decimal separator. */
  dec: string
  /** Units as written in this language. */
  u: { ms: string, hz: string, msec: string, s: string }
  page: {
    title: string
    description: string
    eyebrow: string
    h1: string
    lead: string
    noscript: string
    langs: string
    /** How many pilots went through the wizard; shown from SHOW_COUNT_FROM on. */
    count: string
  }
  ui: {
    progress: string
    progressIntro: string
    optional: string
    clipThis: string
    clipFlight: string
    show: string
    play: string
    pause: string
    choose: string
    cont: string
    back: string
    skipToEnd: string
    soFar: string
    onlyCounted: string
    sameSound: string
    compared: string
    traceAria: string
    chartAria: string
    chartBefore: string
    silent: string
    chartTone: string
    chartPeriodShort: string
    chartPeriod: string
    chartVario: string
    thVario: string
    thTone: string
    thPeriod: string
    thBeep: string
    thShare: string
    thWhen: string
    thValue: string
    rowClimbOn: string
    rowClimbOff: string
    rowSinkOn: string
    rowSinkOff: string
    rowAverage: string
    rowGlide: string
    yes: string
    no: string
    never: string
    was: string
    tableNote: string
    tableNoteMoved: string
    resSub: string
    resH2: string
    resLead: string
    playFlight: string
    fineSub: string
    fineH2: string
    fineLead: string
    whichSound: string
    before: string
    after: string
    undoFine: string
    abClip: string
    abBefore: string
    abAfter: string
    now: string
    wasNow: string
    chartSub: string
    tableSub: string
    applySub: string
    applyH2: string
    toApp: string
    /** {table} = the applyTable link. */
    applyOther: string
    applyTable: string
    pitch: string
    noFbLink: string
    shareSub: string
    shareH2: string
    shareLead: string
    share: string
    shareText: string
    copyLink: string
    copied: string
    sharedSub: string
    sharedH2: string
    sharedLead: string
    findOwn: string
    changeLast: string
    restart: string
    appName: string
    refTempo: string
    refPitch: string
    refStart: string
    refReact: string
  }
  others: {
    sub: string
    h2: string
    few: string
    note: string
    /** Pilots so far; shown from SHOW_COUNT_FROM on. */
    total: string
    yours: string
    half: string
    lower: string
    sinkNever: string
    where: string
    instrument: string
    knobs: Record<string, string>
  }
  facts: {
    glide: string
    glideOn: string
    glideOff: string
    start: string
    stop: string
    near: string
    pitch: string
    beepStart: string
    beep1: string
    beep3: string
    beep5: string
    sink: string
    sinkStop: string
    react: string
    silence: string
    ticks: string
    soft: string
    steady: string
    beep: string
    never: string
    styleSteady: string
    stylePulsed: string
    styleSlow: string
    falling: string
    sinkValue: string
    instant: string
    balanced: string
    calm: string
    reactValue: string
  }
  clips: Record<ClipKey, string>
  where: Record<string, string>
  whereFallback: string
  instruments: Record<string, string>
  steps: Record<string, StepText>
  refines: Record<string, { t: string, e: string, a: string, b: string }>
}

export function fmt(s: string, v: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m))
}
