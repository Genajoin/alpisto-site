/**
 * "You and other pilots": the wizard's answers go to the FlyBeeper presets
 * worker (anonymous, one row per browser), and the totals come back to set
 * this pilot's sound against everyone's. If the worker cannot be reached the
 * card simply stays hidden.
 */
import { signed } from './describe'
import type { Knobs } from './generator'
import { INSTRUMENTS } from './fit'
import { fmt, type Dict } from './i18n/types'

export const API: string = import.meta.env.PUBLIC_PRESETS_URL ?? 'https://api2.flybeeper.com/presets'

export interface Stats {
  n: number
  answers: Record<string, Record<string, number>>
  knobs: Record<string, { n: number, q: number[] }>
  sinkNever: number
}

/** Below this many pilots the numbers say nothing yet. */
const MIN_PILOTS = 5
/** Below this many the count of pilots is not shown anywhere: a handful would only put people off. */
export const SHOW_COUNT_FROM = 30
const ROWS = ['climbStart', 'sinkOn', 'pitchLow', 'pitchHigh', 'tempoLow', 'tempoHigh', 'average'] as const

let memId = ''
function browserId(): string {
  const make = () => {
    const b = crypto.getRandomValues(new Uint8Array(16))
    return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  try {
    let id = localStorage.getItem('vw.id')
    if (!id) {
      id = make()
      localStorage.setItem('vw.id', id)
    }
    return id
  }
  catch {
    memId ||= make()
    return memId
  }
}

let timer = 0
/** Sends the answers a moment after the last change (fine-tuning clicks come in bursts). */
export function sendAnswers(d: Dict, answers: Record<string, string>, knobs: Knobs, done: (s: Stats) => void): void {
  clearTimeout(timer)
  timer = window.setTimeout(async () => {
    try {
      const r = await fetch(`${API}/survey`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: browserId(), lang: d.lang, answers, knobs }),
      })
      if (r.ok)
        done(((await r.json()) as { stats: Stats }).stats)
    }
    catch {
      // offline or the worker is not there: no comparison, nothing else breaks
    }
  }, 1200)
}

export function loadStats(done: (s: Stats) => void): void {
  fetch(`${API}/survey/stats`)
    .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
    .then((s) => s && done(s))
    .catch(() => {})
}

/** Share of pilots below v, from 21 quantiles; ties count half. */
export function shareBelow(q: number[], v: number): number {
  const lo = q.findIndex((x) => x >= v)
  if (lo < 0)
    return 100
  let hi = lo
  while (hi + 1 < q.length && q[hi + 1]! <= v)
    hi++
  if (q[lo]! > v) {
    if (lo === 0)
      return 0
    const a = q[lo - 1]!
    return Math.round(((lo - 1) + (v - a) / (q[lo]! - a)) * 5)
  }
  return Math.round((lo + hi) / 2 * 5)
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

function value(d: Dict, key: string, v: number): string {
  if (key === 'climbStart' || key === 'sinkOn')
    return signed(d, v)
  if (key === 'average')
    return v.toFixed(2).replace('.', d.dec)
  return String(Math.round(v))
}

/** The middle half as a box, 5…95 % as whiskers, the median as a tick, this pilot as a dot. */
function strip(q: number[], v: number): string {
  const W = 320, H = 26, pad = 8
  const lo = Math.min(q[1]!, v), hi = Math.max(q[19]!, v)
  const span = hi - lo || 1
  const x = (u: number) => pad + (u - lo) / span * (W - 2 * pad)
  return `<svg class="vw-strip" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">
    <line x1="${x(q[1]!)}" x2="${x(q[19]!)}" y1="13" y2="13" stroke="var(--color-ink-3)" stroke-width="1.5"/>
    <rect x="${x(q[5]!)}" y="6" width="${Math.max(2, x(q[15]!) - x(q[5]!))}" height="14" fill="var(--color-paper-alt)" stroke="var(--color-ink-3)"/>
    <line x1="${x(q[10]!)}" x2="${x(q[10]!)}" y1="4" y2="22" stroke="var(--color-ink)" stroke-width="2"/>
    <circle cx="${x(v)}" cy="13" r="6" fill="var(--color-accent)" stroke="var(--color-ink)" stroke-width="1.5"/>
  </svg>`
}

function bars(title: string, counts: Record<string, number> | undefined, label: (k: string) => string): string {
  if (!counts)
    return ''
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!total)
    return ''
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return `<div class="vw-bars"><p class="vw-pv-cliplabel">${esc(title)}</p>${top.map(([k, n]) => {
    const p = Math.round(n / total * 100)
    return `<div class="vw-barrow"><span>${esc(label(k))}</span><span class="vw-barline"><i style="width:${p}%"></i></span><span class="vw-barp">${p} %</span></div>`
  }).join('')}</div>`
}

/** saved: this pilot's own answers went in (not a shared link someone else made). */
export function renderOthers(box: HTMLElement, d: Dict, s: Stats, k: Knobs, saved: boolean): void {
  const O = d.others
  let body = ''
  if (s.n < MIN_PILOTS) {
    body = `<p class="vw-qlead">${esc(O.few)}</p>`
  }
  else {
    const rows: string[] = []
    for (const key of ROWS) {
      const st = s.knobs[key]
      const v = k[key]
      if (!st || st.n < MIN_PILOTS || typeof v !== 'number' || (key === 'sinkOn' && v <= -10))
        continue
      rows.push(`<div class="vw-cmp">
        <div class="vw-cmp-text"><strong>${esc(O.knobs[key] ?? key)}</strong>
          <span class="vw-opt-hint">${esc(O.yours)}: <b>${esc(value(d, key, v))}</b> · ${esc(fmt(O.half, { a: value(d, key, st.q[5]!), b: value(d, key, st.q[15]!) }))} · ${esc(fmt(O.lower, { p: shareBelow(st.q, v) }))}</span></div>
        ${strip(st.q, v)}</div>`)
    }
    const never = s.sinkNever ? `<p class="vw-note">${esc(fmt(O.sinkNever, { p: Math.round(s.sinkNever / s.n * 100) }))}</p>` : ''
    const whereLabel = (key: string) => d.steps.where?.o?.[key]
    body = `<div class="vw-cmps">${rows.join('')}</div>${never}
      <div class="vw-barsgrid">
        ${bars(O.where, s.answers.where, (key) => {
          const o = whereLabel(key)
          return typeof o === 'string' ? o : o ? o[0] : key
        })}
        ${bars(O.instrument, s.answers.instrument, (key) => d.instruments[key] ?? INSTRUMENTS.find((i) => i.key === key)?.name ?? key)}
      </div>`
  }
  box.innerHTML = `<p class="vw-sub">${esc(O.sub)}</p><h2 class="vw-h2 vw-h2-s">${esc(O.h2)}</h2>${body}${saved ? `<p class="vw-note">${esc(O.note)}${s.n >= SHOW_COUNT_FROM ? ` ${esc(fmt(O.total, { n: s.n }))}` : ''}</p>` : ''}`
  box.hidden = false
}
