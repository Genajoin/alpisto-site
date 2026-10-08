/**
 * A sound in words and numbers, so two answers can be compared line by line.
 */
import { paramsOf, toneAt } from './engine'
import type { Knobs, Sound } from './generator'
import { fmt, type Dict } from './i18n/types'

export interface Fact {
  key: string
  label: string
  value: string
}

/** A vario value with its sign and the language's decimal mark: +0.10, −2,50. */
export function signed(d: Dict, v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', d.dec)}`
}

export function describe(d: Dict, s: Sound, k: Knobs): Fact[] {
  const F = d.facts
  const ms = (v: number) => signed(d, v)
  const hz = (f: number) => `${Math.round(f / 10) * 10} ${d.u.hz}`
  const beepAt = (cm: number) => {
    const t = toneAt(s.curves, cm)
    const beep = Math.round(t.cycle * t.duty / 100 / 10) * 10
    const per = Math.round(t.cycle / 10) * 10
    return t.duty >= 90 ? F.steady : fmt(F.beep, { beep, per })
  }
  const p = paramsOf(s.trigger)
  const start = Math.round(k.climbStart * 100)
  const facts: Fact[] = []
  const add = (key: string, label: string, value: string) => facts.push({ key, label, value })

  add('start', F.start, `${ms(k.climbStart)} ${d.u.ms}`)
  add('stop', F.stop, `${ms(p.climbOff / 100)} ${d.u.ms}`)
  add('near', F.near,
    k.nearZero === 'silent'
      ? F.silence
      : k.nearZero === 'ticks'
        ? fmt(F.ticks, { v: ms(k.nearFrom) })
        : fmt(F.soft, { f: hz(s.curves.freqDots[2]!), v: ms(k.nearFrom) }))
  const at = [start + 1, 100, 300, 500]
  add('pitch', F.pitch, at.map((v) => hz(toneAt(s.curves, v).f)).join(' · '))
  add('beepStart', F.beepStart, beepAt(start + 1))
  add('beep1', F.beep1, beepAt(100))
  add('beep3', F.beep3, beepAt(300))
  add('beep5', F.beep5, beepAt(500))
  if (k.sinkOn <= -10) {
    add('sink', F.sink, F.never)
  }
  else {
    const style = k.sinkStyle === 'continuous' ? F.styleSteady : k.sinkStyle === 'pulsed' ? F.stylePulsed : F.styleSlow
    const fa = toneAt(s.curves, p.sinkOn - 1).f
    const fb = toneAt(s.curves, Math.max(-1000, p.sinkOn - 200)).f
    const pitch = Math.abs(fa - fb) < 5 ? hz(fa) : fmt(F.falling, { f: hz(fa), f2: hz(fb), v: ms((p.sinkOn - 200) / 100) })
    add('sink', F.sink, fmt(F.sinkValue, { v: ms(k.sinkOn), style, pitch }))
    add('sinkStop', F.sinkStop, `${ms(p.sinkOff / 100)} ${d.u.ms}`)
  }
  const react = k.average <= 0.15 ? F.instant : k.average <= 0.4 ? F.balanced : F.calm
  add('react', F.react, fmt(F.reactValue, { react, v: k.average.toFixed(2).replace('.', d.dec) }))
  return facts
}

/** Lines that differ between two sounds: [label, before, after]. */
export function diff(a: Fact[], b: Fact[]): [string, string, string][] {
  const out: [string, string, string][] = []
  for (const fb of b) {
    const fa = a.find((x) => x.key === fb.key)
    if (fa && fa.value !== fb.value)
      out.push([fb.label, fa.value, fb.value])
  }
  return out
}
