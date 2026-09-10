---
title: "The note that never sounds: what a piezo vario actually plays"
description: "A pilot in r/freeflight asked for a vario that sounds like an instrument instead of a smoke alarm. Everyone lets you tune the curve; nobody lets you tune the timbre. So I put a FANET Vario in a desk drawer with a microphone and measured what the piezo does with the tones the firmware sends it. At 1000 Hz the fundamental comes out 33 dB below its own third harmonic — below 2.8 kHz the instrument never plays the note that was set. Loudness swings 16 dB across the tone table, one number fills the worst hole by 11.5 dB, and the obvious soft-attack idea turned out to be an accent rather than a fade."
pubDate: 2026-09-10
tags: ["flybeeper", "fanet-vario", "sun-vario", "variometer", "piezo", "audio", "pwm", "firmware", "nrf52", "zephyr", "measurement", "paragliding", "hardware"]
draft: false
heroImage: "/img/blog/vario-piezo-tone-measured/hero.png"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

A pilot posted in r/freeflight looking for a small vario with a tone they could live with. They are
a musician, they named another maker's instrument as the sound they wanted, and the thread found
the real gap on its own: every vario on the market lets you tune the *curve* — where the beeping
starts, how fast it climbs, how pitch maps to lift — and not one of them lets you tune the
*timbre*.

That is a fair complaint and an awkward one, because the sound comes out of a ceramic disc the size
of a fingernail driven by a chip that has exactly two output states. There is no volume knob in
there, no filter, no waveform. So the honest question is not "can we make it sound nice" but "how
much of the sound is actually a free parameter, given the parts already soldered to the board".

I put a [FANET Vario](/blog/flybeeper-fanet-vario/) in a desk drawer with a microphone and measured
it. The answer turned out to be more interesting than yes or no: the instrument was not playing the
notes I thought it was.

## What is actually in the sound path

Two components decide everything.

The emitter is a **KLJ-1230**: a 12 × 12 mm surface-mount piezo disc, 16 nF of static capacitance,
which the manufacturer rates at 4.1 kHz — the frequency at which they quote 83 dB at 10 cm from a
3 Vpp square wave. Nobody publishes a response curve, because there is nothing flattering to
publish. A piezo disc is a resonator, not a loudspeaker.

The driver is a **PAM8904E**, and this is the part that surprises people. It is not an amplifier.
It is an H-bridge with a charge pump in front of it: the digital input pin swings the bridge, and
the output is ±VOUT with nothing in between. The volume setting on the device is not gain — it is
the charge-pump multiplier, 1×, 2× or 3× the supply. That is also why a beeping vario's current
draw depends on how full its battery is, which came up when I measured
[an energy budget for the SunVario](/blog/sun-vario-energy-budget-measured/): a piezo is a
capacitive load, and power goes with the square of the drive.

So the firmware cannot produce a sine wave. It cannot produce any wave. What it controls is:

- **frequency** — how often the bridge flips;
- **duty cycle** — the ratio of the two states within a period;
- **timing of the edges** — when a note starts and stops.

That is the entire instrument. Everything below is about how much sound design fits into those
three knobs.

One more detail from the datasheet that matters later: the chip shuts itself down after 42 ms
without an input signal, and needs up to 1.9 ms in 3× mode to bring the rail back. In a vario's
climb pattern most gaps between beeps are longer than 42 ms, so nearly every beep starts with the
charge pump waking up.

## The rig: a firmware that plays a rigid schedule

Measuring this needs no synchronisation cable, just discipline. I built a test firmware behind a
Kconfig flag — `default n`, so the shipped image is byte-identical with the option off — that plays
one fixed cycle forever:

- a start marker: five 60 ms bursts at 2 kHz, then a second of silence;
- blocks of 28 tones from 200 Hz to 6 kHz, each 300 ms long with a 200 ms gap;
- click tests: ten 100 ms beeps at 1 kHz, which is where attack and decay get measured;
- all of it repeated at each of the three volume settings.

Because the schedule is rigid, the analysis only has to find the start marker by correlation. After
that every tone is addressable by arithmetic: tone *n* of a block starts at *B* + 800 + 500·*n*
milliseconds. The script slices out 50–280 ms of each tone — the steady part, past the attack — and
takes a 65 536-point FFT.

The first recording was made on a desk next to a PC with fans. The second was made with the board
and the microphone shut in a desk drawer, which dropped the noise floor by 9 to 14 dB in every band
and removed a broadband smear near the resonance that turned out to be the desk, not the device.
Everything quoted below is from the drawer, at volume setting 2.

Two honest caveats. The microphone is a plain USB condenser with no calibration, so every number
here is a *relative* level in dBFS — differences are meaningful, absolute sound pressure is not.
And the board was measured bare, outside its enclosure; the enclosure has a cavity that changes the
absolute levels, though not the physics.

## The first result: below 2.8 kHz you never hear the note that was set

![Measured level of the fundamental and of the loudest partial actually radiated, plotted against the tone frequency the firmware asks for](/img/blog/vario-piezo-tone-measured/missing-fundamental.svg)

The blue line is the tone the firmware asked for. The orange line is the loudest thing the piezo
actually radiated. Below 2.8 kHz they are not the same signal at all.

At 1000 Hz — an ordinary, mid-table beep — the fundamental comes out at −57.7 dBFS and the third
harmonic at 3 kHz comes out at −25.2. The note is **33 dB below its own third harmonic**. The worst
case in the sweep is 315 Hz, where the fundamental is at −80.8, close enough to the noise floor to
be arguable, and the loudest partial is the *ninth* harmonic at 2835 Hz, 48.8 dB above it.

The crossover is at 2.8 kHz. Above that the disc radiates the note itself and the harmonics fall
away as they should. Below it, the piezo is a bandpass filter with its passband at 3–8 kHz — the
main resonance measured at 3.8–4.2 kHz, with a second region around 7–8 kHz — and everything the
pilot hears is upper partials of a fundamental that never made it into the air.

This does not mean the pitch is wrong. The ear is good at inferring a fundamental from a series of
harmonics — the classic missing-fundamental effect — and 3, 5 and 7 kHz are unambiguously the
harmonics of 1 kHz. A pilot hears the beep rise and fall exactly as the curve intends.

But "a tone made entirely of its own upper partials, concentrated in the band where human hearing
is most sensitive" is a fairly precise physical definition of *harsh*. The thin, piercing quality
that the Reddit thread was complaining about is not a firmware choice. It is what a 12 mm ceramic
disc does with anything below its resonance.

## The second result: 16 dB of loudness the pilot never asked for

The same sweep, read differently:

![Loudness of every tone in the table at one volume setting, as shipped and after choosing a duty cycle per frequency](/img/blog/vario-piezo-tone-measured/loudness-table.svg)

At a single volume setting, the loudness of the tone table swings **16.5 dB** from 500 Hz to 6 kHz.
That is not a gentle tilt — it is peaks where some harmonic happens to land on the resonance and
holes where none does.

The worst hole sits at 1800–2000 Hz, and that is not a harmless place for it. In the default vario
curve, 2020 Hz is 4.5 m/s: strong lift, the moment the sound matters most. Right there the
instrument is 13 dB quieter than it is at 2500 Hz, for no reason the pilot can see or fix. Turning
the volume up moves the whole table, holes included.

## The one lever: duty cycle

The rectangular wave has one property worth exploiting. The amplitude of its *k*-th harmonic is

```
H(k, D) ∝ |sin(k·π·D)| / k
```

where *D* is the duty cycle. Each harmonic has its own maximum at *D* = 1/(2k), and its own zeros.
At 50 % the odd harmonics are as strong as they can be and the even ones are gone by construction —
which is exactly the "square wave" sound everyone recognises.

![Amplitude of each harmonic of a rectangular wave against its duty cycle, showing that harmonic k peaks at a duty of one over two k](/img/blog/vario-piezo-tone-measured/duty-harmonics.svg)

Since the piezo only radiates what lands in 3–8 kHz, the duty cycle is a way of choosing *which
harmonic gets to sit on the resonance*. That is the whole trick, and in the 2 kHz hole it works
beautifully. At 50 % duty the loudest thing a 2 kHz tone produces is its third harmonic at 6 kHz,
in a quiet stretch of the response, while the even harmonics that would land on 4 and 8 kHz are
suppressed by construction. Moving to 37 % turns them on:

![Measured harmonic levels of the 2 kHz tone at 50 per cent and at 37 per cent duty, showing the second and fourth harmonics rising by 30 and 50 dB](/img/blog/vario-piezo-tone-measured/energy-moves.svg)

The 4 kHz partial rises from −52.7 to −21.9 dBFS and the 8 kHz one from −70.0 to −20.2 — the two
places this disc is loud, both filled from a tone that could reach neither. The total is
**+11.5 dB at 2000 Hz and +7.6 dB at 1800 Hz**, measured on the device, from changing one number in
a table. The hole is gone.

What does not work is the tempting generalisation. I tried to flatten the whole table this way, and
it cannot be done:

- Above 2.8 kHz the fundamental is what you hear, and its amplitude, sin(πD), is monotonic. Any
  duty below 50 % makes the tone quieter *and* adds an octave — a second harmonic where there was
  none. Cleanliness costs loudness in the same move.
- Below 2.8 kHz the opposite: because you are listening to harmonics, reducing the duty tends to
  make a tone *louder*, not quieter. There is no "turn this one down" direction.
- The nodes have to be measured, not guessed. My first table used 37 % from 1500 Hz upward, and the
  measurement came back with 1500 and 1600 Hz **1.8 and 3.7 dB quieter** than before. The hole
  starts later than it looks. The shipping table moves to 37 % only between 1700 and 2100 Hz.

So the honest score for the duty-cycle lever: the table's spread goes from 16.5 dB to 13.5 dB, and
the one hole that mattered is filled. It is a fix, not a transformation.

## The negative result: the obvious soft attack is an accent

Now the part I got wrong, which is the more useful half of the article.

A vario beep as shipped is a hard gate: the bridge starts flipping at full duty and the piezo is at
full amplitude within a millisecond. That instant edge is the click everybody hears in a quiet
room. The textbook fix is a fade-in, and on this hardware there is an obvious way to do one without
any new components: since amplitude follows sin(πD), ramp the duty cycle from ~2 % to 50 % over ten
milliseconds and you have an attack envelope for free.

I implemented it, flashed it over the air, recorded it, and it was worse.

![Envelope of one 100 millisecond beep at 1 kHz with a hard gate, a linear duty ramp and a geometric ramp, averaged over ten beeps](/img/blog/vario-piezo-tone-measured/envelopes.svg)

The orange trace is that linear ramp. Instead of rising smoothly it overshoots to 4.5 dB *above*
the steady level of the note, dips 6 dB, comes back — and then does the same thing on the way out,
sitting 3.9 dB above the steady level at a point where the beep should already be decaying into
silence. It is not a fade. It is an accent at both ends, a small "wow" wrapped around every beep.

The reason is in the harmonic chart above. Below 2.8 kHz you are listening to harmonics 3 through
5, and each of those peaks at *D* = 1/(2k) — between 10 % and 17 % duty. A linear ramp from 2 % to
50 % spends its middle third crossing exactly those values. It walks straight over a hump that the
steady tone never visits.

The response model built from the sweep puts numbers on it: a 1 kHz tone is already as loud at 7 %
duty as it is at 50 %, and stays louder than the steady note up to about 20 %. The recording says
the excursion is larger than the model predicts, which is what you get when a real resonance is
sharper than a smooth interpolation of it. Averaged over every tone below 2.8 kHz, the peak in the
first 25 ms of a note sits 1.6 dB above the steady level with a hard gate and **3.2 dB with the
linear ramp**, reaching 6.4 dB at 1500 Hz. The ramp did not soften the attack. It doubled it.

This is a good example of a plausible idea that only measurement can kill. It sounds right, the
physics behind "amplitude follows sin(πD)" is correct, and the conclusion is still wrong, because
the thing being ramped is not the thing being heard.

## The fix: a ramp that jumps

If the hump lies between the quiet end and the target, do not walk through it. Jump.

The second envelope does three things:

1. **Geometric, not linear.** The duty grows by a constant *ratio* each step, roughly 3 dB per
   millisecond, because hearing is logarithmic and a linear ramp lurches even when there is no
   hump. Implemented with a 34-byte table of 2^(k/16) in Q10 fixed point — no floating point in the
   firmware.
2. **Stops at a knee.** For tones below 2.8 kHz the ramp ends at 3 % duty, under the hump for most
   of the band — though not, as it turns out, for the lowest two tones. Above 2.8 kHz there is no
   hump at all and the ramp runs all the way to the target.
3. **Then jumps.** From the knee to the target duty in a single PWM period. The frequency never
   changes during any of this; only the pulse width moves, so the note's pitch is rock steady.

The blue trace is the result. The sound emerges from the noise floor and takes about twelve
milliseconds to arrive; the rise from −20 dB to −3 dB goes from **0.7 ms to 6.7 ms**, a tenfold
slower edge, and an edge is what a click is. At the tail, where the linear ramp sat 3.9 dB *above*
the steady level at a moment the note should have been decaying, the geometric one is 14 dB below
it.

What the envelope does not do is remove the overshoot, and it should not try: a resonator excited
from rest rings above its steady amplitude however you start it. Across all 28 tones the peak in
the first 25 ms is 1.6 dB above steady with a hard gate and 1.9 dB with the geometric envelope —
the same transient, arriving more slowly — against 3.2 dB for the linear ramp. That gap between
1.9 and 3.2 dB is the entire result: not the absence of a transient, but the absence of the extra
one the ramp invented.

One honest exception, visible in the same measurement. At the two lowest entries in the table,
200 and 250 Hz, the geometric ramp overshoots 1–2 dB *more* than a hard gate, because a
3 % knee is already above the steady level down there. Those two entries are −14 and −8 m/s: the
deep-sink alarm, where a harder onset is arguably the correct behaviour anyway.

Two things did not change, which is how you know the envelope is doing only what it should. The
steady part of every tone in the table is identical with and without it, within 0.3 dB. And the
release is honest about its limits: the piezo rings for about 9 ms of its own accord after the
drive stops, so a release ramp shorter than that is inaudible either way.

The cost is worth stating precisely, if only because "add an envelope" sounds expensive. The
calibration table, the envelope and the fixed-point exponentials together add **696 bytes of code**
to the buzzer module and three bytes of RAM, and with the Kconfig option off the image is
byte-for-byte identical to one built without the feature at all.

There is one timing tax. Each 1 ms ramp step actually costs about 1.1 ms, because `k_sleep()`
rounds up to the next kernel tick and the PWM update is not free, so a 10/10 ms envelope stretches
a 100 ms beep by roughly 2 ms — measured as a 2.07 ms drift per repetition against 0.2 ms for plain
beeps. Nobody will hear that in a climb, but a vario loop that assumes exact beep lengths needs to
know.

## What firmware cannot do

For completeness, the things that came up and did not survive contact with the hardware.

**A sine wave.** Not possible. The output stage has two states. Every discussion of "smooth
waveforms" on this hardware has to end here.

**Class D into the piezo.** The temptation is to run a 200 kHz carrier, modulate it, and let the
piezo's own capacitance do the filtering. The energy says no. Driving a 16 nF capacitor between
rails 9 V apart at 200 kHz costs C·V²·f ≈ 260 mW, all of it in the charge pump — against an
instrument whose entire draw during a beeping climb is a few hundred microamps. It would need a
series inductor of a millihenry or two to become a real class-D output stage. That is a board
change, and it is untested.

**A different driver or a different emitter.** Both are real options and both are a different
product, not a firmware update. A moving-coil speaker is a resistive load in a completely different
power class; on a solar instrument that never gets plugged in, it is not a trade you can make
quietly.

## What this means for the pilot

The Reddit question deserves a straight answer: on a piezo vario, timbre is not a free parameter,
and any manufacturer who offers you a "tone character" setting on this class of hardware is
offering you a choice of which harmonic sits on the resonance. That is what it is. It is not
nothing — it is 11.5 dB in the place where the old table had a hole — but it is not a synthesiser.

What is genuinely adjustable, and what I would rather spend the effort on, is *how a note begins*.
The click at the start of every beep is not a piezo property. It is a firmware choice that nobody
had questioned, and it can be replaced with a real attack for 696 bytes and two milliseconds.

Both changes now exist and both have been measured on the bench. Neither has flown yet: the next
step is wiring them into the vario's own tone loop rather than a test harness, and then a flight
where the only thing that matters is whether a pilot notices anything at all. That is the honest
state of it.

The thing I will keep from this is smaller and more general. I had been reading the tone table as a
table of notes — 470 Hz for 0.4 m/s, 2020 Hz for 4.5 — and it is nothing of the kind. It is a table
of *excitations* for a resonator that answers in its own voice, and half the entries in it never
produce the note they name. Once you look at it that way, "make it sound nicer" stops being a
matter of taste and turns into a question with numbers in it.
