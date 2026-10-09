/**
 * The wizard in the browser: questions, sounds on the audio clock, the result
 * with fine-tuning, chart, table and the comparison with other pilots. Mounted
 * by components/VarioWizard.astro on #vw; the language comes from data-lang.
 */
import { DEFAULT_KNOBS, generate, tidy, type Knobs, type Sound } from './generator'
import { TICK_MS, paramsOf, simulate, toneAt, type Beep } from './engine'
import { CLIPS, type ClipKey } from './scenarios'
import { REFINES, flow, stepByKey, type Answers, type Step } from './steps'
import { INSTRUMENTS, instrument } from './fit'
import { appLink, decodeState, encodeState } from './share'
import { describe, diff, signed } from './describe'
import { fmt, type Dict, type OptText } from './i18n/types'
import { renderOthers, sendAnswers, loadStats } from './others'

const root = document.getElementById('vw')!
/** The page's language; its words load before the first screen. */
let d!: Dict
/** True once the pilot answers here: only then are the answers sent (a shared link is someone else's). */
let ownRun = false
/** Opened from a link a friend sent: greet them and lead to their own sound. */
let viaShare = false
const canShare = typeof navigator.share === 'function'
/** Free-text answers: kept with the pilot's answers, never put into a link to share. */
const TEXT_STEPS = ['annoy', 'wizard']
/** The count of pilots shows under the intro from this many on. */
const COUNT_FROM = 20
let knobs: Knobs = { ...DEFAULT_KNOBS }
let answers: Answers = {}
/** State before each answered step, so Back undoes it. */
const undo: { knobs: Knobs, answers: Answers }[] = []
/** Answers Back has undone: shown as chosen again, and Next takes them. */
let remembered: Answers = {}
/** Position in flow(answers); past its end is the result. */
let pos = 0

// ---------- sound ----------
let ctx: AudioContext | null = null
let playing: { btn: HTMLButtonElement, label: string, paused: boolean, stop: () => void, swap: () => void } | null = null
const VOLUME = 0.12

function stopPlaying() {
  const p = playing
  playing = null
  p?.stop()
  // A paused context stays paused: wake it so the next sound plays.
  if (p?.paused)
    void ctx?.resume()
}

interface Run { beeps: Beep[], track: number[] }
const runCache = new Map<string, Run>()
function runFor(k: Knobs, clip: ClipKey): Run {
  const key = clip + JSON.stringify(tidy(k))
  let r = runCache.get(key)
  if (!r) {
    const s = generate(k)
    const track: number[] = []
    r = { beeps: simulate(s.curves, s.trigger, CLIPS[clip].air, CLIPS[clip].lenMs, track, s.glide), track }
    runCache.set(key, r)
  }
  return r
}
const beepsFor = (k: Knobs, clip: ClipKey) => runFor(k, clip).beeps

/** Moves the chart's cursor to the vario the instrument hears now; null hides it. */
function moveCursor(chart: SVGSVGElement | null | undefined, cm: number | null) {
  const g = chart?.querySelector<SVGGElement>('.vw-cursor')
  if (!chart || !g)
    return
  if (cm === null) {
    g.style.opacity = '0'
    return
  }
  const ds = chart.dataset
  const lo = Number(ds.lo), hi = Number(ds.hi), x0 = Number(ds.x0), x1 = Number(ds.x1)
  const v = Math.max(lo, Math.min(hi, cm / 100))
  const x = x0 + (v - lo) / (hi - lo) * (x1 - x0)
  const curves = JSON.parse(ds.curves!) as Sound['curves']
  const t = toneAt(curves, cm)
  const yf = Number(ds.py) + Number(ds.ph) - (t.f / Number(ds.fmax)) * Number(ds.ph)
  const yc = Number(ds.qy) + Number(ds.qh) - Math.min(1, t.cycle / 1000) * Number(ds.qh)
  g.querySelector('line')!.setAttribute('x1', String(x))
  g.querySelector('line')!.setAttribute('x2', String(x))
  const [cf, cc] = g.querySelectorAll('circle')
  cf!.setAttribute('cx', String(x)); cf!.setAttribute('cy', String(yf))
  cc!.setAttribute('cx', String(x)); cc!.setAttribute('cy', String(yc))
  const label = g.querySelector('text')!
  label.textContent = `${ms(cm / 100)} ${d.u.ms} · ${Math.round(t.f)} ${d.u.hz}`
  const right = x > (x0 + x1) / 2
  label.setAttribute('x', String(right ? x - 8 : x + 8))
  label.setAttribute('text-anchor', right ? 'end' : 'start')
  g.style.opacity = '1'
}

interface PlaySpec {
  /** The sound to play; asked again whenever playback is rescheduled. */
  k: () => Knobs
  clip: ClipKey
  /** The clip's trace; looked up on every frame, so it can be redrawn while playing. */
  trace?: () => SVGSVGElement | null | undefined
  chart?: () => SVGSVGElement | null | undefined
  loop?: boolean
}

/**
 * Plays a clip on the audio clock. The same button pauses and resumes (the
 * clock stops, so do the beeps and both cursors). `swap()` reschedules from
 * the current moment with whatever `spec.k()` returns now, for before/after.
 */
function play(btn: HTMLButtonElement, spec: PlaySpec) {
  if (playing?.btn === btn) {
    const p = playing
    p.paused = !p.paused
    if (p.paused) {
      void ctx?.suspend()
      btn.textContent = p.label
      btn.setAttribute('aria-pressed', 'false')
    }
    else {
      void ctx?.resume()
      btn.textContent = d.ui.pause
      btn.setAttribute('aria-pressed', 'true')
    }
    return
  }
  stopPlaying()
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended')
    void ctx.resume()
  const audio = ctx
  const len = CLIPS[spec.clip].lenMs / 1000
  let master: GainNode | null = null
  let t0 = 0
  let from = 0
  const schedule = (start: number) => {
    master?.disconnect()
    const m = audio.createGain()
    m.gain.value = VOLUME
    m.connect(audio.destination)
    master = m
    t0 = audio.currentTime + 0.05
    from = start
    for (const { t, d, f, g: glide } of runFor(spec.k(), spec.clip).beeps) {
      if (t < start)
        continue
      const osc = audio.createOscillator()
      const g = audio.createGain()
      osc.type = 'square'
      osc.frequency.value = f
      const at = t0 + (t - start)
      // Retuned in steps on the firmware's 40 ms tick, as the instrument does.
      for (const [gt, gf] of glide ?? [])
        osc.frequency.setValueAtTime(gf, at + (gt - t))
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(1, at + 0.003)
      g.gain.setValueAtTime(1, at + Math.max(d - 0.003, 0.003))
      g.gain.linearRampToValueAtTime(0, at + d)
      osc.connect(g).connect(m)
      osc.start(at)
      osc.stop(at + d + 0.01)
    }
  }
  const position = () => Math.max(0, audio.currentTime - t0 + from)
  schedule(0)
  const label = btn.textContent ?? d.ui.play
  btn.setAttribute('aria-pressed', 'true')
  btn.textContent = d.ui.pause
  const headOf = () => spec.trace?.()?.querySelector<SVGLineElement>('.vw-head')
  let raf = 0
  const tick = () => {
    const el = position()
    const head = headOf()
    if (head) {
      const x = TR.l + Math.max(0, Math.min(1, el / len)) * (TR.w - TR.l - TR.r)
      head.setAttribute('x1', String(x))
      head.setAttribute('x2', String(x))
      head.style.opacity = '1'
    }
    const track = runFor(spec.k(), spec.clip).track
    const i = Math.floor(el * 1000 / TICK_MS)
    moveCursor(spec.chart?.(), i < track.length ? track[i]! : null)
    if (el >= len) {
      if (!spec.loop) {
        stopPlaying()
        return
      }
      schedule(0)
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  playing = {
    btn,
    label,
    paused: false,
    swap: () => schedule(position()),
    stop: () => {
      cancelAnimationFrame(raf)
      master?.disconnect()
      btn.setAttribute('aria-pressed', 'false')
      btn.textContent = label
      const head = headOf()
      if (head)
        head.style.opacity = '0'
      moveCursor(spec.chart?.(), null)
    },
  }
}

// ---------- drawing ----------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
/** Longest free-text answer; the worker keeps the same. */
const TEXT_MAX = 300
const ms = (v: number) => signed(d, v)
const dec = (v: number, n = 2) => v.toFixed(n).replace('.', d.dec)
/** Option label and hint in this language; brand names are not translated. */
function optText(step: Step, key: string): [string, string | undefined] {
  if (step.key === 'instrument')
    return [d.instruments[key] ?? INSTRUMENTS.find((i) => i.key === key)?.name ?? key, undefined]
  const o: OptText | undefined = d.steps[step.key]?.o?.[key]
  return typeof o === 'string' ? [o, undefined] : o ? [o[0], o[1]] : [key, undefined]
}
const vars = () => ({ vario: instrument(answers.instrument)?.name ?? '', where: d.where[answers.where ?? ''] ?? d.whereFallback })

/** The clip's vario trace with the beeps under it. */
const TR = { w: 640, h: 84, l: 34, r: 6 }
/**
 * A beep's colour by its pitch: blue at the low end of a vario's usual tones,
 * red at the high end, on a log scale because the ear hears pitch that way.
 */
const HUE_HZ = [300, 2000] as const
function pitchColor(f: number): string {
  const p = Math.log(Math.max(HUE_HZ[0], Math.min(HUE_HZ[1], f)) / HUE_HZ[0]) / Math.log(HUE_HZ[1] / HUE_HZ[0])
  return `hsl(${Math.round(250 * (1 - p))} 85% 42%)`
}
function traceSvg(k: Knobs, clip: ClipKey): string {
  const c = CLIPS[clip]
  const [lo, hi] = c.range
  const x = (tMs: number) => TR.l + (tMs / c.lenMs) * (TR.w - TR.l - TR.r)
  const y = (cm: number) => 6 + (1 - (cm / 100 - lo) / (hi - lo)) * 52
  const pts: string[] = []
  for (let t = 0; t <= c.lenMs; t += 100)
    pts.push(`${x(t).toFixed(1)},${y(Math.max(lo * 100, Math.min(hi * 100, c.air(t)))).toFixed(1)}`)
  const beeps = beepsFor(k, clip)
  // A beep that glides is drawn piece by piece, each in the colour of its pitch.
  const marks = beeps.map((b) => {
    const cuts: [number, number][] = [[b.t, b.f], ...(b.g ?? [])]
    return cuts.map(([t0, f], i) => {
      const t1 = i + 1 < cuts.length ? cuts[i + 1]![0] : b.t + b.d
      return `<rect x="${x(t0 * 1000).toFixed(1)}" y="66" width="${Math.max(1, x((t1 - t0) * 1000) - TR.l).toFixed(1)}" height="12" fill="${pitchColor(f)}"><title>${Math.round(f)} ${d.u.hz}</title></rect>`
    }).join('')
  }).join('')
  return `<svg class="vw-trace" viewBox="0 0 ${TR.w} ${TR.h}" role="img" aria-label="${esc(d.ui.traceAria)}">
    <line x1="${TR.l}" x2="${TR.w - TR.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--color-ink-3)" stroke-dasharray="3 3" fill="none"/>
    <text x="${TR.l - 6}" y="${y(0) + 4}" text-anchor="end">0</text>
    <text x="${TR.l - 6}" y="${y(hi * 100) + 8}" text-anchor="end">${hi > 0 ? '+' : ''}${hi}</text>
    <text x="${TR.l - 6}" y="${y(lo * 100)}" text-anchor="end">${lo < 0 ? '−' : ''}${Math.abs(lo)}</text>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--color-accent)" stroke-width="2"/>
    ${marks}
    <line class="vw-head" x1="${TR.l}" x2="${TR.l}" y1="2" y2="${TR.h - 2}" stroke="var(--color-ink)" stroke-width="2" style="opacity:0" fill="none"/>
  </svg>`
}

/** Tone and rhythm over the vario axis; silent stretches drawn pale. */
/**
 * Tone and rhythm over the vario axis, drawn at the container's own width so
 * the text stays readable on a phone; silent stretches drawn pale.
 */
function curveSvg(s: Sound, width: number, before?: Sound): string {
  const W = Math.round(Math.max(320, Math.min(960, width)))
  const narrow = W < 560
  const L = narrow ? 40 : 52, R = 12
  const lo = -4, hi = 6
  const x = (v: number) => L + (v - lo) / (hi - lo) * (W - L - R)
  const p = paramsOf(s.trigger)
  // Heard: above the climb threshold (held down to climbOff) and below the sink alarm.
  const heard = (cm: number) => cm > p.climbOff || cm < p.sinkOn
  const P = { y: 26, h: narrow ? 120 : 150 }
  const Q = { y: P.y + P.h + 44, h: narrow ? 110 : 140 }
  const fMax = Math.max(...s.curves.freqDots.filter((_, i) => s.curves.varioDots[i]! <= hi * 100)) * 1.1
  const yf = (f: number) => P.y + P.h - (f / fMax) * P.h
  const yc = (msv: number) => Q.y + Q.h - Math.min(1, msv / 1000) * Q.h
  let prevHeard: boolean | null = null
  const runs: { heard: boolean, pts: { v: number, f: number, c: number, b: number }[] }[] = []
  for (let cm = lo * 100; cm <= hi * 100; cm += 2) {
    const t = toneAt(s.curves, cm)
    const h = heard(cm)
    if (h !== prevHeard)
      runs.push({ heard: h, pts: [] })
    prevHeard = h
    runs[runs.length - 1]!.pts.push({ v: cm / 100, f: t.f, c: t.cycle, b: t.cycle * t.duty / 100 })
  }
  // Layers, bottom to top: grid, silent bands, data, labels.
  let grid = ''
  let bands = ''
  let data = ''
  let labels = ''
  const step = narrow ? 2 : 1
  for (let v = lo; v <= hi; v++) {
    grid += `<line x1="${x(v)}" x2="${x(v)}" y1="${P.y}" y2="${Q.y + Q.h}" stroke="var(--color-ink)" opacity="${v === 0 ? 0.35 : 0.08}" fill="none"/>`
    if ((v - lo) % step === 0 || v === 0)
      labels += `<text x="${x(v)}" y="${Q.y + Q.h + 17}" text-anchor="middle">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}</text>`
  }
  const fTicks = (narrow ? [500, 1000, 2000, 3000, 4000] : [500, 1000, 1500, 2000, 3000, 4000]).filter((f) => f < fMax)
  for (const f of fTicks) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${yf(f)}" y2="${yf(f)}" stroke="var(--color-ink)" opacity="0.06" fill="none"/>`
    labels += `<text x="${L - 6}" y="${yf(f) + 4}" text-anchor="end">${f}</text>`
  }
  for (const c of [250, 500, 750, 1000]) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${yc(c)}" y2="${yc(c)}" stroke="var(--color-ink)" opacity="0.06" fill="none"/>`
    labels += `<text x="${L - 6}" y="${yc(c) + 4}" text-anchor="end">${c}</text>`
  }
  if (before && JSON.stringify(before.curves) !== JSON.stringify(s.curves)) {
    const fb: string[] = []
    const cb: string[] = []
    for (let cm = lo * 100; cm <= hi * 100; cm += 4) {
      const t = toneAt(before.curves, cm)
      fb.push(`${x(cm / 100).toFixed(1)},${yf(t.f).toFixed(1)}`)
      cb.push(`${x(cm / 100).toFixed(1)},${yc(t.cycle).toFixed(1)}`)
    }
    data += `<polyline points="${fb.join(' ')}" fill="none" stroke="var(--color-ink-3)" stroke-width="1.6" stroke-dasharray="5 4"/>`
    data += `<polyline points="${cb.join(' ')}" fill="none" stroke="var(--color-ink-3)" stroke-width="1.4" stroke-dasharray="5 4"/>`
    labels += `<text x="${W - R}" y="${P.y - 10}" text-anchor="end">${esc(d.ui.chartBefore)}</text>`
  }
  for (const r of runs) {
    const col = r.heard ? 'var(--color-ink)' : 'var(--color-ink-3)'
    const op = r.heard ? 1 : 0.4
    const fl = r.pts.map((q) => `${x(q.v).toFixed(1)},${yf(q.f).toFixed(1)}`).join(' ')
    const cl = r.pts.map((q) => `${x(q.v).toFixed(1)},${yc(q.c).toFixed(1)}`).join(' ')
    const area = `M${x(r.pts[0]!.v)},${Q.y + Q.h} ` + r.pts.map((q) => `L${x(q.v).toFixed(1)},${yc(q.b).toFixed(1)}`).join(' ') + ` L${x(r.pts[r.pts.length - 1]!.v)},${Q.y + Q.h} Z`
    data += `<path d="${area}" fill="var(--color-accent)" opacity="${r.heard ? 0.35 : 0.12}"/>`
    data += `<polyline points="${fl}" fill="none" stroke="${col}" stroke-width="2.4" opacity="${op}"/>`
    data += `<polyline points="${cl}" fill="none" stroke="${col}" stroke-width="1.8" opacity="${op}"/>`
    if (!r.heard) {
      const a = x(r.pts[0]!.v), b = x(r.pts[r.pts.length - 1]!.v)
      bands += `<rect x="${a}" y="${P.y}" width="${b - a}" height="${Q.y + Q.h - P.y}" fill="var(--color-paper-alt)" opacity="0.7"/>`
      if (b - a > 50)
        labels += `<text x="${(a + b) / 2}" y="${P.y + 16}" text-anchor="middle">${esc(d.ui.silent)}</text>`
    }
  }
  labels += `<text class="t" x="${L}" y="${P.y - 10}">${esc(d.ui.chartTone)}</text>`
  labels += `<text class="t" x="${L}" y="${Q.y - 12}">${esc(narrow ? d.ui.chartPeriodShort : d.ui.chartPeriod)}</text>`
  labels += `<text x="${W - R}" y="${Q.y + Q.h + 36}" text-anchor="end">${esc(d.ui.chartVario)}</text>`
  const H = Q.y + Q.h + 44
  const cursor = `<g class="vw-cursor" style="opacity:0"><line x1="0" x2="0" y1="${P.y}" y2="${Q.y + Q.h}" stroke="var(--color-accent)" stroke-width="2" fill="none"/><circle r="5" fill="var(--color-accent)" stroke="var(--color-ink)" stroke-width="1.5"/><circle r="5" fill="var(--color-accent)" stroke="var(--color-ink)" stroke-width="1.5"/><text class="t" x="0" y="${P.y + P.h + 15}"></text></g>`
  const dataAttrs = `data-lo="${lo}" data-hi="${hi}" data-x0="${L}" data-x1="${W - R}" data-py="${P.y}" data-ph="${P.h}" data-qy="${Q.y}" data-qh="${Q.h}" data-fmax="${fMax}" data-curves='${JSON.stringify(s.curves)}'`
  return `<svg class="vw-chart" ${dataAttrs} viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(d.ui.chartAria)}">${grid}${bands}${data}<g class="vw-labels">${labels}</g>${cursor}</svg>`
}

function tableHtml(s: Sound, before?: Sound): string {
  const U = d.ui
  const c = s.curves
  const o = before?.curves
  const p = paramsOf(s.trigger)
  const cell = (v: string | number, was?: string | number) =>
    was !== undefined && String(was) !== String(v) ? `<td class="is-changed" title="${esc(fmt(U.was, { v: was }))}">${v}</td>` : `<td>${v}</td>`
  const rows = c.varioDots.map((v, i) => {
    const silent = !(v > p.climbOff || v < p.sinkOff)
    const beep = Math.trunc(c.cycleDots[i]! * c.dutyDots[i]! / 100)
    const beepWas = o ? Math.trunc(o.cycleDots[i]! * o.dutyDots[i]! / 100) : undefined
    return `<tr class="${silent ? 'is-silent' : ''}">${cell(ms(v / 100), o ? ms(o.varioDots[i]! / 100) : undefined)}${cell(c.freqDots[i]!, o?.freqDots[i])}${cell(c.cycleDots[i]!, o?.cycleDots[i])}${cell(beep, beepWas)}${cell(c.dutyDots[i]!, o?.dutyDots[i])}<td class="c-silent">${silent ? esc(U.silent) : ''}</td></tr>`
  }).join('')
  const t = s.trigger
  const w = before?.trigger
  const never = t.sinkOn <= -10
  const val = (x: number) => `${ms(x)} ${d.u.ms}`
  const sec = (x: number) => `${dec(x)} ${d.u.s}`
  return `<div class="vw-tablewrap"><table class="vw-table">
    <thead><tr><th>${esc(U.thVario)}</th><th>${esc(U.thTone)}</th><th>${esc(U.thPeriod)}</th><th>${esc(U.thBeep)}</th><th>${esc(U.thShare)}</th><th class="c-silent"></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <div class="vw-tablewrap" style="margin-top:14px"><table class="vw-table vw-when">
    <thead><tr><th>${esc(U.thWhen)}</th><th>${esc(U.thValue)}</th></tr></thead><tbody>
    <tr><td>${esc(U.rowClimbOn)}</td>${cell(val(t.climbOn), w ? val(w.climbOn) : undefined)}</tr>
    <tr><td>${esc(U.rowClimbOff)}</td>${cell(val(t.climbOff), w ? val(w.climbOff) : undefined)}</tr>
    <tr><td>${esc(U.rowSinkOn)}</td>${cell(never ? U.never : val(t.sinkOn), w ? (w.sinkOn <= -10 ? U.never : val(w.sinkOn)) : undefined)}</tr>
    <tr><td>${esc(U.rowSinkOff)}</td>${cell(never ? '—' : val(t.sinkOff), w ? (w.sinkOn <= -10 ? '—' : val(w.sinkOff)) : undefined)}</tr>
    <tr><td>${esc(U.rowAverage)}</td>${cell(sec(t.average), w ? sec(w.average) : undefined)}</tr>
    <tr><td>${esc(U.rowGlide)}</td>${cell(s.glide ? U.yes : U.no, before ? (before.glide ? U.yes : U.no) : undefined)}</tr>
    </tbody></table></div>
    <p class="vw-note">${esc(U.tableNote)}${o ? ` ${esc(U.tableNoteMoved)}` : ''}</p>`
}

// ---------- screens ----------
function saveHash() {
  window.history.replaceState(null, '', `#s=${encodeState({ k: tidy(knobs), a: answers })}`)
}

const titleOf = (step: Step) => fmt(d.steps[step.key]?.t ?? step.key, vars())
const leadOf = (step: Step) => {
  const l = d.steps[step.key]?.l
  return l ? fmt(l, vars()) : ''
}

function optionKnobs(step: Step, key: string): Knobs {
  const o = step.options.find((x) => x.key === key)!
  return tidy({ ...knobs, ...(o.apply?.(knobs, { ...answers, [step.key]: key }) ?? {}) })
}

/** What an answer changes, line by line, against the sound so far. */
function diffHtml(step: Step | null, key: string | null): string {
  const base = describe(d, generate(knobs), tidy(knobs))
  if (key === null || !step) {
    return `<p class="vw-pv-title">${esc(d.ui.soFar)}</p><dl class="vw-facts">${base.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`
  }
  const o = step.options.find((x) => x.key === key)!
  const k = optionKnobs(step, key)
  const lines = diff(base, describe(d, generate(k), k))
  const [label, hint] = optText(step, key)
  const head = `<p class="vw-pv-title">«${esc(label)}»${hint ? ` <span class="vw-opt-hint">${esc(hint)}</span>` : ''}</p>`
  if (!o.apply)
    return `${head}<p class="vw-pv-same">${esc(d.ui.onlyCounted)}</p>`
  if (!lines.length)
    return `${head}<p class="vw-pv-same">${esc(d.ui.sameSound)}</p>`
  return `${head}<p class="vw-pv-same">${esc(d.ui.compared)}</p><dl class="vw-facts">${lines.map(([l, x, y]) => `<div><dt>${esc(l)}</dt><dd><span class="was">${esc(x)}</span> → <b>${esc(y)}</b></dd></div>`).join('')}</dl>`
}

/** Record an answer (or a skip, value null) and go on. */
function answer(step: Step, value: string | null) {
  stopPlaying()
  ownRun = true
  undo.push({ knobs: { ...knobs }, answers: { ...answers } })
  if (value === null)
    delete remembered[step.key]
  if (value !== null) {
    answers[step.key] = value
    const o = step.options.find((x) => x.key === value)
    if (o?.apply)
      knobs = tidy({ ...knobs, ...o.apply(knobs, answers) })
  }
  pos++
  next()
}

function goBack() {
  const u = undo.pop()
  if (!u)
    return
  remembered = { ...remembered, ...answers }
  knobs = u.knobs
  answers = u.answers
  pos = Math.max(0, pos - 1)
  renderStep()
}

function renderStep() {
  stopPlaying()
  const keys = flow(answers)
  if (pos >= keys.length) {
    renderResult()
    return
  }
  const step = stepByKey(keys[pos]!)
  const clip: ClipKey = step.clip ?? 'flight'
  const done = Math.round(pos / keys.length * 100)
  // Until the profile questions are answered the way ahead is not known: no total yet.
  // A familiar vario's 'is this it?' decides between a short and a full path too.
  const decided = (key: string) => !keys.includes(key) || answers[key] !== undefined || pos > keys.indexOf(key)
  const pathKnown = decided('where') && decided('familiar')
  const lead = leadOf(step)
  const prev = answers[step.key] ?? remembered[step.key]
  const picked = (k: string) => (prev ?? '').split(',').includes(k)
  // Every step has the same Back and Next. Next keeps the answer given before (after Back)
  // or the marks and fields on screen; with nothing given it goes on without an answer.
  const prevOpt = prev !== undefined && step.options.some((o) => o.key === prev) ? prev : null
  let body = ''
  if (step.kind === 'sound') {
    body = `<div class="vw-opts">${step.options.map((o) => {
      const [label, hint] = optText(step, o.key)
      return `<div class="vw-opt${picked(o.key) ? ' is-picked' : ''}" data-opt="${o.key}">
        <div class="vw-opt-text"><div class="vw-opt-label">${esc(label)}</div>${hint ? `<div class="vw-opt-hint">${esc(hint)}</div>` : ''}</div>
        <div class="vw-opt-btns">
          <button type="button" class="vw-btn" data-show="${o.key}">${esc(d.ui.show)}</button>
          <button type="button" class="vw-btn play" data-listen="${o.key}" aria-pressed="false">${esc(d.ui.play)}</button>
          <button type="button" class="vw-btn ink" data-pick="${o.key}">${esc(d.ui.choose)}</button>
        </div></div>`
    }).join('')}</div>`
  }
  else if (step.kind === 'listen') {
    body = `<div class="vw-nav" style="margin-top:0"><button type="button" class="vw-btn accent play" id="vw-listen" aria-pressed="false">${esc(d.ui.play)}</button></div>
      <div class="vw-opts" style="margin-top:14px">${step.options.map((o) => {
        const [label, hint] = optText(step, o.key)
        return `<button type="button" class="vw-choice${picked(o.key) ? ' is-picked' : ''}" data-pick="${o.key}">${esc(label)}${hint ? `<span class="vw-opt-hint">${esc(hint)}</span>` : ''}</button>`
      }).join('')}</div>`
  }
  else if (step.kind === 'info' && step.multi) {
    body = `<div class="vw-opts">${step.options.map((o) => `<button type="button" class="vw-choice" data-toggle="${o.key}" aria-pressed="${picked(o.key)}">${esc(optText(step, o.key)[0])}</button>`).join('')}</div>`
  }
  else if (step.kind === 'info') {
    body = `<div class="vw-opts${step.options.length > 6 ? ' vw-opts-grid' : ''}">${step.options.map((o) => {
      const [label, hint] = optText(step, o.key)
      return `<button type="button" class="vw-choice${picked(o.key) ? ' is-picked' : ''}" data-pick="${o.key}">${esc(label)}${hint ? `<span class="vw-opt-hint">${esc(hint)}</span>` : ''}</button>`
    }).join('')}</div>`
  }
  else {
    // One field per option, each answer under the option's own key.
    body = `<div class="vw-fields">${step.options.map((o) => {
      const [label, hint] = optText(step, o.key)
      return `<label class="vw-field"><span class="vw-opt-label">${esc(label)}</span>${hint ? `<span class="vw-opt-hint">${esc(hint)}</span>` : ''}
        <textarea class="vw-text" data-field="${o.key}" maxlength="${TEXT_MAX}" rows="3">${esc(answers[o.key] ?? remembered[o.key] ?? '')}</textarea></label>`
    }).join('')}</div>`
  }
  const withSound = step.kind === 'sound' || step.kind === 'listen'
  root.innerHTML = `
    <div><div class="vw-progress"><span>${esc(pathKnown ? fmt(d.ui.progress, { n: pos + 1, total: keys.length }) : fmt(d.ui.progressIntro, { n: pos + 1 }))}</span><span>${pathKnown ? `${done} %` : ''}</span></div><div class="vw-bar"><i style="width:${pathKnown ? done : 0}%"></i></div></div>
    <div class="vw-card">
      ${step.optional ? `<p class="vw-sub">${esc(d.ui.optional)}</p>` : ''}
      <h2 class="vw-q">${esc(titleOf(step))}</h2>
      ${lead ? `<p class="vw-qlead">${esc(lead)}</p>` : ''}
      ${withSound ? `<p class="vw-pv-cliplabel">${esc(step.clip ? fmt(d.ui.clipThis, { clip: d.clips[clip] }) : d.ui.clipFlight)}</p><div id="vw-trace"></div>` : ''}
      ${body}
      ${withSound ? `<div class="vw-preview" id="vw-preview"><div class="vw-pv-chart" id="vw-pv-chart"></div><div class="vw-pv-text" id="vw-pv-text"></div></div>` : ''}
      <div class="vw-nav">
        <button type="button" class="vw-btn" data-back ${undo.length === 0 ? 'disabled' : ''}>${esc(d.ui.back)}</button>
        <button type="button" class="vw-btn ink" id="vw-continue">${esc(d.ui.cont)}</button>
        ${step.optional ? `<button type="button" class="vw-btn" data-finish>${esc(d.ui.skipToEnd)}</button>` : ''}
      </div>
    </div>`

  root.querySelector('[data-back]')!.addEventListener('click', goBack)
  root.querySelector('[data-finish]')?.addEventListener('click', () => {
    ownRun = true
    undo.push({ knobs: { ...knobs }, answers: { ...answers } })
    pos = flow(answers).length
    next()
  })
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-pick]'))
    b.addEventListener('click', () => answer(step, b.dataset.pick!))
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-toggle]'))
    b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')))
  root.querySelector('#vw-continue')?.addEventListener('click', () => {
    if (step.kind === 'text') {
      stopPlaying()
      ownRun = true
      undo.push({ knobs: { ...knobs }, answers: { ...answers } })
      for (const t of root.querySelectorAll<HTMLTextAreaElement>('[data-field]')) {
        const v = t.value.trim().slice(0, TEXT_MAX)
        if (v)
          answers[t.dataset.field!] = v
        else
          delete answers[t.dataset.field!]
      }
      pos++
      next()
      return
    }
    if (!step.multi) {
      answer(step, prevOpt)
      return
    }
    const on = [...root.querySelectorAll<HTMLButtonElement>('[data-toggle][aria-pressed="true"]')].map((b) => b.dataset.toggle!)
    answer(step, on.length ? on.join(',') : null)
  })
  if (!withSound)
    return

  const traceBox = root.querySelector<HTMLElement>('#vw-trace')!
  const chartBox = root.querySelector<HTMLElement>('#vw-pv-chart')!
  const textBox = root.querySelector<HTMLElement>('#vw-pv-text')!
  const preview = root.querySelector<HTMLElement>('#vw-preview')!
  let shown: string | null = null
  const show = (key: string | null, scroll = false) => {
    shown = key
    const k = key === null ? tidy(knobs) : optionKnobs(step, key)
    redraw = () => { chartBox.innerHTML = curveSvg(generate(k), chartBox.clientWidth) }
    redraw()
    textBox.innerHTML = diffHtml(step.kind === 'sound' ? step : null, key)
    traceBox.innerHTML = traceSvg(k, clip)
    for (const row of root.querySelectorAll<HTMLElement>('[data-opt]'))
      row.classList.toggle('is-shown', row.dataset.opt === key)
    // The description sits under the answers; bring it into view only when it is off screen.
    if (scroll) {
      const r = preview.getBoundingClientRect()
      if (r.top > window.innerHeight - 80)
        preview.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    return traceBox.querySelector('svg') ?? undefined
  }
  show(null)
  const listen = root.querySelector<HTMLButtonElement>('#vw-listen')
  listen?.addEventListener('click', () => play(listen, { k: () => knobs, clip, trace: () => traceBox.querySelector('svg'), chart: () => chartBox.querySelector('svg') }))
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-show]'))
    b.addEventListener('click', () => show(shown === b.dataset.show ? null : b.dataset.show!, true))
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-listen]')) {
    b.addEventListener('click', () => {
      const key = b.dataset.listen!
      if (shown !== key)
        show(key)
      play(b, { k: () => optionKnobs(step, key), clip, trace: () => traceBox.querySelector('svg'), chart: () => chartBox.querySelector('svg') })
    })
  }
}

function next() {
  saveHash()
  renderStep()
}

/** The sound as the answers left it; fine-tuning is compared against it. */
let fineBase: Knobs | null = null
let abSide: 'before' | 'after' = 'after'
let abClip: ClipKey = 'climb'

function refineNow(key: string, k: Knobs): string {
  const s = generate(k)
  if (key === 'tempo') {
    const t = toneAt(s.curves, 100)
    return fmt(d.ui.refTempo, { beep: Math.round(t.cycle * t.duty / 100), per: Math.round(t.cycle) })
  }
  if (key === 'pitch')
    return fmt(d.ui.refPitch, { f: Math.round(toneAt(s.curves, 100).f) })
  if (key === 'start')
    return fmt(d.ui.refStart, { v: ms(k.climbStart) })
  return fmt(d.ui.refReact, { v: dec(k.average) })
}

function renderResult() {
  stopPlaying()
  fineBase ??= tidy(knobs)
  abSide = 'after'
  const U = d.ui
  const refines = REFINES.map((r) => {
    const x = d.refines[r.key]!
    return `
    <div class="vw-ref" data-ref="${r.key}">
      <div class="vw-ref-text"><strong>${esc(x.t)}</strong><span class="vw-opt-hint">${esc(x.e)}</span><span class="vw-now" data-now="${r.key}"></span></div>
      <div class="vw-ref-btns">
        <button type="button" class="vw-btn" data-move="${r.key}" data-dir="-1">${esc(x.a)}</button>
        <button type="button" class="vw-btn" data-move="${r.key}" data-dir="1">${esc(x.b)}</button>
      </div></div>`
  }).join('')
  root.innerHTML = `
    ${viaShare ? `<div class="vw-card vw-shared">
      <p class="vw-sub">${esc(U.sharedSub)}</p>
      <h2 class="vw-h2 vw-h2-s">${esc(U.sharedH2)}</h2>
      <p class="vw-qlead">${esc(U.sharedLead)}</p>
      <button type="button" class="vw-btn accent" data-own>${esc(U.findOwn)}</button>
    </div>` : ''}
    <div class="vw-card">
      <p class="vw-sub">${esc(viaShare ? U.sharedSub : U.resSub)}</p>
      <h2 class="vw-h2">${esc(U.resH2)}</h2>
      <p class="vw-qlead">${esc(U.resLead)}</p>
      <button type="button" class="vw-btn accent play" id="vw-flight" aria-pressed="false">${esc(U.playFlight)}</button>
      <div id="vw-flight-trace"></div>
    </div>
    <div class="vw-card">
      <p class="vw-sub">${esc(U.fineSub)}</p>
      <h2 class="vw-h2 vw-h2-s">${esc(U.fineH2)}</h2>
      <p class="vw-qlead">${esc(U.fineLead)}</p>
      <div class="vw-refine">${refines}</div>
      <div class="vw-ab">
        <button type="button" class="vw-btn accent play" id="vw-ab-play" aria-pressed="false">${esc(U.play)}</button>
        <div class="vw-seg" role="group" aria-label="${esc(U.whichSound)}">
          <button type="button" class="vw-btn" data-side="before">${esc(U.before)}</button>
          <button type="button" class="vw-btn" data-side="after">${esc(U.after)}</button>
        </div>
        <button type="button" class="vw-btn" id="vw-ab-reset">${esc(U.undoFine)}</button>
      </div>
      <p class="vw-pv-cliplabel" id="vw-ab-clip"></p>
      <div id="vw-ab-trace"></div>
    </div>
    <div class="vw-card">
      <p class="vw-sub">${esc(U.chartSub)}</p>
      <div id="vw-res-chart"></div>
    </div>
    <div class="vw-card">
      <p class="vw-sub">${esc(U.tableSub)}</p>
      <div id="vw-res-table"></div>
    </div>
    <div class="vw-cta">
      <p class="vw-sub">${esc(U.applySub)}</p>
      <h2 class="vw-h2 vw-h2-s">${esc(U.applyH2)}</h2>
      <a class="vw-btn accent" id="vw-app" href="#" target="_blank" rel="noopener">${esc(U.toApp)}</a>
      <p class="vw-cta-alt">${fmt(esc(U.applyOther), { table: `<a href="#vw-res-table" data-totable>${esc(U.applyTable)}</a>` })}</p>
      <div class="vw-cta-pitch">
        <p>${esc(U.pitch)}</p>
        <a class="vw-btn vw-btn-dark" href="/flybeeper">${esc(U.noFbLink)}</a>
      </div>
    </div>
    <div class="vw-card" id="vw-others" hidden></div>
    <div class="vw-card">
      <p class="vw-sub">${esc(U.shareSub)}</p>
      <h2 class="vw-h2 vw-h2-s">${esc(U.shareH2)}</h2>
      <p class="vw-qlead">${esc(U.shareLead)}</p>
      <div class="vw-nav" style="margin-top:0">
        ${canShare ? `<button type="button" class="vw-btn accent" id="vw-share">${esc(U.share)}</button>` : ''}
        <button type="button" class="vw-btn${canShare ? '' : ' accent'}" id="vw-copy">${esc(U.copyLink)}</button>
        <span class="vw-copied" id="vw-copied"></span>
      </div>
    </div>
    <div class="vw-nav">
      ${viaShare ? '' : `<button type="button" class="vw-btn" id="vw-back">${esc(U.changeLast)}</button>`}
      <button type="button" class="vw-btn${viaShare ? ' accent' : ''}" id="vw-restart">${esc(viaShare ? U.findOwn : U.restart)}</button>
    </div>`

  const resChart = root.querySelector<HTMLElement>('#vw-res-chart')!
  const flightBox = root.querySelector<HTMLElement>('#vw-flight-trace')!
  const abBox = root.querySelector<HTMLElement>('#vw-ab-trace')!
  const abPlay = root.querySelector<HTMLButtonElement>('#vw-ab-play')!
  const flightBtn = root.querySelector<HTMLButtonElement>('#vw-flight')!
  const changed = () => JSON.stringify(tidy(knobs)) !== JSON.stringify(fineBase)
  const abKnobs = () => (abSide === 'before' ? fineBase! : knobs)

  const update = () => {
    const s = generate(knobs)
    const before = changed() ? generate(fineBase!) : undefined
    redraw = () => { resChart.innerHTML = curveSvg(s, resChart.clientWidth, before) }
    redraw()
    root.querySelector('#vw-res-table')!.innerHTML = tableHtml(s, before)
    for (const r of REFINES) {
      const now = refineNow(r.key, knobs)
      const was = refineNow(r.key, fineBase!)
      root.querySelector(`[data-now="${r.key}"]`)!.innerHTML = now === was
        ? esc(fmt(U.now, { v: now }))
        : fmt(U.wasNow.split('<br>').map(esc).join('<br>'), { was: `<span class="was">${esc(was)}</span>`, now: `<b>${esc(now)}</b>` })
    }
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-side]')) {
      b.setAttribute('aria-pressed', String(b.dataset.side === abSide))
      b.disabled = !changed()
    }
    root.querySelector<HTMLButtonElement>('#vw-ab-reset')!.disabled = !changed()
    root.querySelector('#vw-ab-clip')!.textContent = fmt(U.abClip, { clip: d.clips[abClip], side: abSide === 'before' ? U.abBefore : U.abAfter })
    root.querySelector<HTMLAnchorElement>('#vw-app')!.href = appLink(s, U.appName)
    // The beep strips follow every change, also while playing.
    flightBox.innerHTML = traceSvg(knobs, 'flight')
    abBox.innerHTML = traceSvg(abKnobs(), abClip)
    if (playing?.btn === abPlay || playing?.btn === flightBtn)
      playing.swap()
    saveHash()
    // Fine-tuning changes the sound: the comparison and the stored answers follow.
    if (ownRun)
      sendAnswers(d, answers, tidy(knobs), (st) => renderOthers(othersBox, d, st, tidy(knobs), true))
  }
  const othersBox = root.querySelector<HTMLElement>('#vw-others')!

  const startAb = () => play(abPlay, { k: abKnobs, clip: abClip, trace: () => abBox.querySelector('svg'), chart: () => resChart.querySelector('svg'), loop: true })
  abPlay.addEventListener('click', () => {
    if (playing?.btn !== abPlay)
      abBox.innerHTML = traceSvg(abKnobs(), abClip)
    startAb()
  })
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-move]')) {
    b.addEventListener('click', () => {
      const r = REFINES.find((x) => x.key === b.dataset.move)!
      const dir = Number(b.dataset.dir) as -1 | 1
      knobs = tidy({ ...knobs, ...r.move(knobs, dir) })
      answers[`refine.${r.key}`] = String(Number(answers[`refine.${r.key}`] ?? 0) + dir)
      abSide = 'after'
      if (abClip !== r.clip) {
        abClip = r.clip
        // Another knob, another clip: restart it from the top.
        if (playing?.btn === abPlay) {
          stopPlaying()
          abBox.innerHTML = traceSvg(abKnobs(), abClip)
          update()
          startAb()
          return
        }
      }
      update()
    })
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-side]')) {
    b.addEventListener('click', () => {
      abSide = b.dataset.side as 'before' | 'after'
      update()
    })
  }
  root.querySelector('#vw-ab-reset')!.addEventListener('click', () => {
    knobs = { ...fineBase! }
    for (const r of REFINES)
      delete answers[`refine.${r.key}`]
    abSide = 'after'
    update()
  })
  flightBtn.addEventListener('click', () => {
    play(flightBtn, { k: () => knobs, clip: 'flight', trace: () => flightBox.querySelector('svg'), chart: () => resChart.querySelector('svg') })
  })
  update()
  if (!ownRun)
    loadStats((st) => renderOthers(othersBox, d, st, tidy(knobs), false))

  root.querySelector('#vw-copy')!.addEventListener('click', async () => {
    const out = root.querySelector('#vw-copied')!
    const url = shareUrl()
    try {
      await navigator.clipboard.writeText(url)
      out.textContent = U.copied
    } catch {
      out.textContent = url
    }
  })
  root.querySelector('#vw-share')?.addEventListener('click', () => {
    navigator.share({ title: d.page.title, text: U.shareText, url: shareUrl() }).catch(() => {})
  })
  root.querySelector('[data-totable]')!.addEventListener('click', (e) => {
    e.preventDefault()
    root.querySelector('#vw-res-table')?.closest('.vw-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  const restart = () => {
    knobs = { ...DEFAULT_KNOBS }
    answers = {}
    remembered = {}
    fineBase = null
    undo.length = 0
    pos = 0
    viaShare = false
    document.querySelector<HTMLElement>('.vw-lead')?.removeAttribute('hidden')
    window.history.replaceState(null, '', location.pathname)
    renderStep()
    root.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  root.querySelector('[data-own]')?.addEventListener('click', restart)
  root.querySelector('#vw-back')?.addEventListener('click', () => {
    fineBase = null
    if (undo.length) {
      goBack()
      return
    }
    // Opened from a link: no history, start from the last question with these answers.
    pos = flow(answers).length - 1
    renderStep()
  })
  root.querySelector('#vw-restart')!.addEventListener('click', restart)
}

/**
 * The link a pilot sends to a friend: the sound and the answers that shape it,
 * without the free-text answers (those are the pilot's own feedback), marked
 * so the page greets the friend instead of the author.
 */
function shareUrl(): string {
  const a = Object.fromEntries(Object.entries(answers).filter(([k]) => !TEXT_STEPS.includes(k)))
  return `${location.origin}${location.pathname}#s=${encodeState({ k: tidy(knobs), a })}&f=1`
}

/** Redraws the chart on screen at its current width. */
let redraw: () => void = () => {}
let resizeTimer = 0
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => redraw(), 150)
})

// The page's words, then the first screen. A shared link opens straight on the result.
const DICTS = import.meta.glob<{ default: Dict }>('./i18n/[a-z][a-z].ts')
void (async () => {
  const lang = root.dataset.lang ?? 'en'
  d = (await (DICTS[`./i18n/${lang}.ts`] ?? DICTS['./i18n/en.ts']!)()).default
  // How many went through it, under the intro; a handful would only put people off.
  loadStats((s) => {
    const el = document.getElementById('vw-count')
    if (el && s.n >= COUNT_FROM) {
      el.textContent = fmt(d.page.count, { n: s.n })
      el.hidden = false
    }
  })
  const shared = decodeState(location.hash)
  viaShare = !!shared && /[#&]f=1\b/.test(location.hash)
  // A friend's link: the greeting comes first, the page's long intro would push it off the screen.
  if (viaShare)
    document.querySelector<HTMLElement>('.vw-lead')?.setAttribute('hidden', '')
  if (shared) {
    knobs = tidy({ ...DEFAULT_KNOBS, ...shared.k })
    answers = shared.a
    pos = flow(answers).length
    renderResult()
  } else {
    renderStep()
  }
})()
