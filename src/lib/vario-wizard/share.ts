/**
 * Links out of the wizard.
 *
 * The FlyBeeper app link is the app's own preset share format (flybeeper
 * apps/maps/src/devices/presetShare.ts): base64url of [name, {code: value}],
 * where a code stands for a settings UUID by its index in the app's list. The
 * app opens it with an "apply to your instrument" banner.
 */
import type { Sound } from './generator'
import type { Knobs } from './generator'

export const APP_BASE = 'https://maps.flybeeper.com/'

// Indexes in the app's SHARE_UUIDS: 1 climb on, 2 climb off, 3 sink on,
// 4 sink off, 5 early exit, 6 smooth frequency change, 7 averaging, 8–11 the four curves.
const CODE = {
  climbOn: '_b', climbOff: '_c', sinkOn: '_d', sinkOff: '_e', hyst: '_f', glide: '_g', average: '_h',
  vario: '_i', freq: '_j', cycle: '_k', duty: '_l',
} as const

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes)
    bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): string {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function appLink(s: Sound, name = 'My vario sound'): string {
  const t = s.trigger
  const bag = {
    [CODE.vario]: s.curves.varioDots,
    [CODE.freq]: s.curves.freqDots,
    [CODE.cycle]: s.curves.cycleDots,
    [CODE.duty]: s.curves.dutyDots,
    [CODE.climbOn]: t.climbOn,
    [CODE.climbOff]: t.climbOff,
    [CODE.sinkOn]: t.sinkOn,
    [CODE.sinkOff]: t.sinkOff,
    [CODE.hyst]: t.hyst,
    [CODE.average]: t.average,
    [CODE.glide]: s.glide,
  }
  return `${APP_BASE}#preset=${b64url(JSON.stringify([name, bag]))}`
}

/** The wizard's own state in the page hash: knobs and answers. */
export interface State {
  k: Knobs
  a: Record<string, string>
}

export function encodeState(s: State): string {
  return b64url(JSON.stringify(s))
}

export function decodeState(hash: string): State | null {
  const m = hash.match(/s=([\w-]+)/)
  if (!m)
    return null
  try {
    const s = JSON.parse(fromB64url(m[1]!)) as State
    return s && typeof s.k === 'object' && typeof s.a === 'object' ? s : null
  } catch {
    return null
  }
}
