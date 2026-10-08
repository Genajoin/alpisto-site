/**
 * A sound in words and numbers, so two answers can be compared line by line.
 */
import { paramsOf, toneAt } from './engine'
import type { Knobs, Sound } from './generator'

export interface Fact {
  key: string
  label: string
  value: string
}

const ms = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
const hz = (f: number) => `${Math.round(f / 10) * 10} Hz`

function beepAt(s: Sound, cm: number): string {
  const t = toneAt(s.curves, cm)
  const beep = Math.round(t.cycle * t.duty / 100 / 10) * 10
  const per = Math.round(t.cycle / 10) * 10
  return t.duty >= 90 ? 'a steady tone' : `${beep} ms every ${per} ms`
}

export function describe(s: Sound, k: Knobs): Fact[] {
  const p = paramsOf(s.trigger)
  const start = Math.round(k.climbStart * 100)
  const facts: Fact[] = []
  const add = (key: string, label: string, value: string) => facts.push({ key, label, value })

  add('start', 'Climb beeps start above', `${ms(k.climbStart)} m/s`)
  add('stop', 'On the way down they stop at', `${ms(p.climbOff / 100)} m/s`)
  add('near', 'Between zero and the sink alarm',
    k.nearZero === 'silent'
      ? 'silence'
      : k.nearZero === 'ticks'
        ? `rare ticks from ${ms(k.nearFrom)} m/s`
        : `a soft ${hz(s.curves.freqDots[2]!)} sound from ${ms(k.nearFrom)} m/s`)
  const at = [start + 1, 100, 300, 500]
  add('pitch', 'Pitch at the start, +1, +3, +5 m/s', at.map((v) => hz(toneAt(s.curves, v).f)).join(' · '))
  add('beepStart', 'Beep at the start', beepAt(s, start + 1))
  add('beep1', 'Beep at +1 m/s', beepAt(s, 100))
  add('beep3', 'Beep at +3 m/s', beepAt(s, 300))
  add('beep5', 'Beep at +5 m/s', beepAt(s, 500))
  if (k.sinkOn <= -10) {
    add('sink', 'Sink alarm', 'never')
  }
  else {
    const style = k.sinkStyle === 'continuous' ? 'a steady tone' : k.sinkStyle === 'pulsed' ? 'a pulsing tone' : 'one short beep a second'
    const fa = toneAt(s.curves, p.sinkOn - 1).f
    const fb = toneAt(s.curves, Math.max(-1000, p.sinkOn - 200)).f
    const pitch = Math.abs(fa - fb) < 5 ? hz(fa) : `${hz(fa)} falling to ${hz(fb)} at ${ms((p.sinkOn - 200) / 100)}`
    add('sink', 'Sink alarm', `below ${ms(k.sinkOn)} m/s, ${style}, ${pitch}`)
    add('sinkStop', 'On the way out of sink it stops at', `${ms(p.sinkOff / 100)} m/s`)
  }
  const react = k.average <= 0.15 ? 'instant' : k.average <= 0.4 ? 'balanced' : 'calm'
  add('react', 'Reaction', `${react}, averaging ${k.average.toFixed(2)} s`)
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
