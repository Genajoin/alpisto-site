---
title: "The note that never sounds: what a piezo vario actually plays"
description: "Small varios beep in a way nobody would call pleasant, and it is not because nobody cared. A piezo disc is a bell with one note of its own, and a vario plays a tune on it by feeding it square waves and letting the bell pick what it likes. I put one in a desk drawer with a microphone: at 1000 Hz the note that was asked for comes out 33 dB below its own third harmonic, loudness swings 16 dB across the tone table, and the obvious way to soften a beep turns out to make it sharper."
pubDate: 2026-09-10
tags: ["flybeeper", "fanet-vario", "sun-vario", "variometer", "piezo", "audio", "pwm", "firmware", "nrf52", "zephyr", "measurement", "paragliding", "hardware"]
draft: false
heroImage: "/img/blog/vario-piezo-tone-measured/hero.png"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

Every small vario beeps, and most of them beep in a way nobody would call pleasant. Thin, sharp,
metallic, closer to a smoke alarm than to an instrument. It is tempting to put that down to cheap
parts and nobody caring.

That is not where it comes from. It falls out of what the sound is made by, and once you look at
what that is, the harshness stops being a matter of taste and becomes a thing you can measure. So I
measured it — a FlyBeeper vario in a closed desk drawer with a microphone — to find out how much of
it can be fixed in firmware and how much cannot.

## What is actually making the sound

A piezo buzzer is not a tiny loudspeaker. Inside it is a thin brass disc with a layer of ceramic
glued on top. Put a voltage across the ceramic and it tries to stretch sideways; the brass does not;
the sandwich has no choice but to bow, like a bimetal strip warming up. Flip the voltage back and
forth and the disc flutters and pushes air.

The difference from a loudspeaker matters more than the similarity. A speaker cone is deliberately
floppy, hung on a soft rubber surround so it can follow whatever signal you give it. A piezo disc is
stiff and clamped at the rim, and anything stiff has a note of its own — the frequency at which it
would rather vibrate. Ours is 12 mm across and rings at about 4 kHz. Tap a wine glass and you get
the same idea: the glass answers with its note, not yours.

Being a bell has two consequences.

At its own note the disc is loud, and away from it the disc is not merely a bit quieter but tens of
decibels quieter. You are pushing on a stiff plate that does not want to move.

And the electronics cannot help. The chip that drives it is not an amplifier — it is a switch that
throws the disc between plus and minus a fixed voltage, with nothing in between. There is no volume
control in the usual sense either: the three volume settings simply pick how high that fixed voltage
is. The vario does not play a tone. It switches a voltage on and off at the rate the firmware asks
for.

## How a bell plays a tune

Switching on and off gives you a square wave, and a square wave is not a pure tone. It is a bundle:
the frequency you asked for, plus a ladder of multiples above it — three times, five times, seven
times — each a little weaker than the last.

Feed that bundle to a disc that only answers near 4 kHz and it will not play the note at the bottom
of the ladder. It picks whichever rung falls closest to its own resonance and radiates that, while
the rest goes nowhere.

That is how an instrument with a single note plays a tune. It does not, quite. It offers the disc a
comb of frequencies and lets the disc choose.

Here is what that looks like on a real device, with the firmware asking for 28 different tones and a
microphone listening:

![Measured level of the fundamental and of the loudest partial actually radiated, plotted against the tone frequency the firmware asks for](/img/blog/vario-piezo-tone-measured/missing-fundamental.svg)

The blue line is the note the firmware asked for. The orange line is the loudest thing that actually
came out. Below 2.8 kHz they are not the same signal. At 1000 Hz — an ordinary, middle-of-the-table
beep — the requested note is 33 dB below its own third harmonic. Around 315 Hz the gap reaches
49 dB, and the loudest thing in the air is the ninth rung of the ladder.

Two things follow, and between them they explain the sound.

The pitch is still right. Your ear is good at reconstructing a missing bottom note from a series of
harmonics — it is doing exactly that every time you hear a bass line on a phone speaker that cannot
produce bass at all. A pilot hears the beeping rise and fall as the curve intends.

But the timbre is made entirely of upper partials, sitting in the 3–8 kHz band where human hearing
is at its sharpest. That is a fairly precise physical description of harsh. The metallic quality is
not a firmware choice and not a cost-cutting decision; it is what a 12 mm disc does with anything
below its resonance.

There is a second symptom from the same cause. As the pitch rises, which rung of the ladder lands on
the resonance keeps changing, so the loudness lurches:

![Loudness of every tone in the table at one volume setting, as shipped and after choosing a duty cycle per frequency](/img/blog/vario-piezo-tone-measured/loudness-table.svg)

At one volume setting, the tone table swings 16.5 dB from end to end. The worst hole is at
1800–2000 Hz, which in the default curve is 4 to 4.5 m/s — strong lift, exactly when the sound
matters most. Turning the volume up moves the whole table, hole included.

## What can be done about it

Four honest routes, from the ones that need a screwdriver to the one that needs nothing.

A bigger disc. Resonance drops as the plate grows, and a 20–27 mm plate rings somewhere around
2.5–3.5 kHz. That would put most of the tone table back into the range the disc radiates as itself,
which is the difference between hearing a note and hearing its harmonics. This is the most promising
direction and the one being tried next; the same driver copes with the larger plate without any
change.

The enclosure. A cavity behind the disc and a grille in front of it change the answer as much as the
disc does. Everything below was measured on a bare board, and the calibration that comes out of it
belongs to a particular disc in a particular box — swap either and it has to be measured again.

A driver that can make a smooth wave. They exist, and they idle at milliamps. A solar vario lives on
hundreds of microamps and is never plugged in, so that is not a firmware update but a different
product with a different battery.

Or leave every component where it is and use the two things the firmware actually controls: which
rung of the ladder lands on the resonance, and how a note begins. Only this one is free, and it is
the rest of this article.

## The rig

The measurement needs no synchronisation cable, only a rigid schedule. A test firmware behind a
build flag — off by default, and with it off the image is byte-for-byte the same — plays one fixed
cycle forever: a marker of five short bursts at 2 kHz, then blocks of 28 tones from 200 Hz to 6 kHz
at 300 ms each, then rows of ten short beeps for measuring attack and decay. The analysis finds the
marker by correlation and then every tone by arithmetic, and takes a 65 536-point transform over the
steady middle of each one.

The first recording was made on a desk next to a PC. The second, which is the one quoted here, was
made with the board and the microphone shut in a desk drawer: the noise floor dropped by 9 to 14 dB
and a broadband smear near the resonance disappeared, having turned out to be the desk. The
microphone is uncalibrated, so every level here is relative — differences mean something, absolute
loudness does not.

## Choosing which rung lands on the resonance

The one knob with real authority is the duty cycle: the fraction of each period the switch spends on
one side. It does not change the pitch. It changes the recipe of the ladder, by a rule simple enough
to write on a napkin — the strength of the k-th rung follows sin(kπD)/k, where D is that fraction.

![Amplitude of each harmonic of a rectangular wave against its duty cycle, showing that harmonic k peaks at a duty of one over two k](/img/blog/vario-piezo-tone-measured/duty-harmonics.svg)

Every rung has a duty cycle at which it is loudest, and one at which it disappears entirely. At the
symmetric 50 % the odd rungs are as strong as they get and the even ones vanish — that is the square
wave sound everyone recognises.

Since the disc only radiates what lands near 4 kHz, this becomes a way to pick the rung it will
hear. In the 2 kHz hole it works beautifully. At 50 % duty the loudest thing a 2 kHz tone makes is
its third harmonic at 6 kHz, in a dead part of the response, while the even harmonics that would
land on 4 and 8 kHz are suppressed by construction. Going to 37 % turns them on:

![Measured harmonic levels of the 2 kHz tone at 50 per cent and at 37 per cent duty, showing the second and fourth harmonics rising by 30 and 50 dB](/img/blog/vario-piezo-tone-measured/energy-moves.svg)

The 4 kHz partial rises from −52.7 to −21.9 dBFS and the 8 kHz one from −70.0 to −20.2 — the two
places this disc is loud, both filled from a tone that could previously reach neither. The result is
11.5 dB more sound at 2000 Hz and 7.6 dB at 1800 Hz, from one number in a table.

What does not work is the tempting generalisation. Flattening the whole table this way is
impossible, for reasons that are worth knowing before anyone offers you a tone character setting:

- Above 2.8 kHz the disc radiates the note itself, and its strength grows steadily with duty. Any
  reduction makes the tone quieter and adds an octave that was not there before. You pay for
  cleanliness with loudness in the same move.
- Below 2.8 kHz it is the other way round. Since you are listening to harmonics, reducing the duty
  usually makes a tone louder, not quieter. There is no turn this one down direction.
- The nodes have to be measured rather than reasoned about. My first table applied 37 % from 1500 Hz
  upward, and the recording came back with 1500 and 1600 Hz quieter than before, by 1.8 and 3.7 dB.
  The hole starts later than it looks. The table that stands now uses 37 % only between 1700 and
  2100 Hz.

So the honest score: the spread across the table goes from 16.5 dB to 13.5 dB and the one hole that
mattered is gone. A fix, not a transformation.

## The attack: a good idea that failed

The other knob is time. A beep as shipped is a hard gate — full amplitude inside a millisecond — and
that instant edge is the click you hear in a quiet room. The textbook remedy is a fade-in, and this
hardware seems to offer one for free: loudness follows the duty cycle, so ramping the duty from a
couple of percent up to 50 % over ten milliseconds should be an attack envelope with no new parts.

I built it, flashed it over the air, recorded it, and it was worse.

![Envelope of one 100 millisecond beep at 1 kHz with a hard gate, a linear duty ramp and a geometric ramp, averaged over ten beeps](/img/blog/vario-piezo-tone-measured/envelopes.svg)

The orange trace is that ramp. Instead of swelling it overshoots above the steady level of its own
note, dips six decibels, comes back — and repeats the trick on the way out, sitting louder than the
note at a moment when the beep should already be fading. Not a fade. An accent at both ends, a small
wow wrapped around every beep. Measured across the table it roughly doubled the overshoot of a plain
hard gate.

The reason is in the harmonic chart above. Below 2.8 kHz you are listening to the third and fifth
rungs, and each of those is loudest at a duty of about 10 to 17 %. A ramp from 2 % to 50 % spends
its middle third walking straight across that hump — a hump the steady note never visits. The
physics behind loudness follows the duty cycle is perfectly correct, and the conclusion is still
wrong, because the thing being ramped is not the thing being heard.

The fix is to not walk through the hump but to jump over it. The envelope that works does three
things. It grows the duty by a constant ratio rather than a constant step, about 3 dB per
millisecond, because hearing is logarithmic. It stops at a knee of 3 %, below the hump. And from
there it jumps to the target duty in a single period, so nothing lingers where the harmonics peak.
The pitch never moves: only the pulse width changes, never the period.

The blue trace is the result. The sound climbs out of silence over about twelve milliseconds, the
rise from −20 to −3 dB stretching from 0.7 ms to 6.7 ms — a tenfold slower edge, and an edge is what
a click is. What it does not remove is the overshoot itself, and it should not try: a bell struck
from rest always rings above its steady level. The geometric ramp leaves that transient where the
hard gate had it, and the linear one added about two decibels on top. That difference is the whole
result.

Two things stayed put, which is how you know the envelope only does what it should. Every tone in
the table measures the same with it and without it, within 0.3 dB. And the release turned out not to
matter: the disc rings for some 9 ms of its own accord after the drive stops, so any shorter ramp
down is inaudible either way.

There is one place it misbehaves. At 200 and 250 Hz the enveloped beep starts harder than a plain
one, because a ten-millisecond ramp at 200 Hz is only two periods long — there is no room for a ramp
at all, and the short pulses it does produce drop their even harmonics straight onto the resonance.
Those two entries are the −8 and −14 m/s sink alarm, where a hard onset is arguably right anyway, so
the envelope simply stays off below 300 Hz.

## What it costs, and what is next

The calibration table, the envelope and the fixed-point exponentials behind it add 696 bytes of code
and three bytes of RAM, and with the build flag off the image is identical to one built without them
at all. There is a small timing tax: each millisecond of ramp really costs about 1.1 ms, because the
kernel rounds a sleep up to its next tick, so a 10 ms envelope stretches a 100 ms beep by roughly
two. Nobody will hear that in a climb, but a tone loop that assumes exact lengths should know.

Neither change has flown. Both live in a test cycle rather than in the vario's own tone loop, and
the next steps are in that order: put them in the loop, measure the device inside its enclosure
instead of bare, and then try the larger plate, which is the only route that attacks the harshness
at its source rather than working around it.

The thing I will keep from this is smaller and more general than any of the numbers. I had been
reading the tone table as a table of notes — 470 Hz for 0.4 m/s, 2020 Hz for 4.5 — and it is nothing
of the kind. It is a table of excitations for a bell that answers in its own voice, and half the
entries in it never produce the note they name. Once you see it that way, make it sound nicer stops
being a matter of taste and turns into a question with numbers in it.
