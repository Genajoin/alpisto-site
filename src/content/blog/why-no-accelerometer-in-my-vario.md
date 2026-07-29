---
title: "Why I don't put an accelerometer in my vario"
description: "A phone's barometer isn't bad — it's read badly, and that's most of why phone-only varios feel laggy. Why I poll a dedicated baro at 60 Hz instead, why an IMU costs more than it gives, how it lies to you in a spiral, and where sensor fusion actually belongs."
pubDate: 2026-07-29
tags: ["flybeeper", "variometer", "barometer", "accelerometer", "imu", "sensor-fusion", "bluetooth-le", "paragliding", "hardware"]
draft: false
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

Two questions come up every single time I show one of these devices to pilots. *What's the
difference between your barometer and the one already in my phone?* And: *are you going to add an
accelerometer?*

They sound like small talk. They're actually the same question asked from two directions, and the
answer to both is the design of the whole device. So here it is properly, with the numbers.

## The phone's barometer isn't the problem — how it gets read is

A phone barometer is a general-purpose part. It's decent silicon. If you put it on a bench and read
it properly, you'd get a usable signal out of it.

But you don't get to read it properly. The operating system samples it slowly and irregularly, on
its own schedule, batching and deferring as it sees fit. By the time your app receives a value,
it's already a little stale — and worse, it's stale by an amount that changes from second to
second. That's most of why a phone-only vario feels laggy: you feel the bump a beat *after* it
happened, and the size of that beat wanders.

You can't filter your way out of this. Filtering trades delay for smoothness; it can't manufacture
information the OS didn't hand you when it mattered.

### Battery saver makes it worse exactly when it matters

A pilot on Reddit put this better than I could: turn on Android's battery saver and the problem
jumps out at you. Battery saver deprioritises precisely what a vario needs — sensor polling slows
down, GPS goes lazy.

And it's a catch-22. The day you most want battery saver on is a long XC day. Which is also the day
you least want your vario guessing.

A dedicated sensor sidesteps the whole argument. It polls at a fixed rate no matter what the phone
is doing, because nothing else is running on it.

## What the dedicated sensor actually does

A high-sensitivity barometer, polled at 60 Hz on hardware that has nothing else to do, with its
own filtering stage on top. Instead of a coarse, jittery reading arriving whenever the OS feels
like it, you get a clean, steady signal with almost no delay — close to how a good zero-lag vario
behaves.

The finished signal goes out over BLE at 10 Hz, as a standard characteristic, and the phone does
what phones are good at: GPS, screen, maps, airspace, task. This is the whole idea behind the
[FlyBeeper line](/blog/flybeeper-pressure-sensor/) — add only what a phone genuinely can't do, and
let the phone do the rest.

## So why not an accelerometer too?

On paper an IMU is exactly what you want: acceleration is the derivative of the thing you're trying
to measure, so it reacts instantly while the barometer is still making up its mind. Every "instant
vario" marketing line is built on that sentence.

In practice it comes with a bill, and the bill is bigger than people expect.

**Power.** An IMU has to be sampled far more often than a barometer. The MCU sleeps less, the
computation goes up by an order of magnitude, and the energy budget stops being a rounding error.
That's the difference between a device that lives on a solar panel and a supercapacitor and one
that needs a rechargeable pack — which then needs a bigger case, a charging port, and a nightly
ritual. My [Sun Vario](/blog/flybeeper-sun-vario/) exists because I refused to pay that bill.

**Diminishing returns.** Above roughly 1 m/s, a well-filtered barometer already tells you what an
IMU-assisted one tells you. The gain lives in the first fraction of a second at low climb rates —
real, but small, and you're paying for it with everything above.

**And it lies to you in a spiral.** This is the one that actually matters. In a turn, the
accelerometer doesn't read your climb rate. It reads the g-load of the turn itself. It cannot tell
the difference between "we are going up" and "we are pulling 1.4 g in a tight 360" — because in the
sensor's own frame of reference those are the same event. So it shows numbers that aren't real,
right at the moment you're working a core and trusting the tone.

I had a video of an inexpensive accelerometer-based vario going quietly insane in rough air for
exactly this reason. It's the kind of thing you have to watch to believe.

### The demonstration-feature trap

Here's what I think is really going on with a lot of these devices. Wave one around on the ground
and it beeps instantly — it's a fantastic thing to show someone in a shop. In real flight, many of
them lean back on the barometer anyway, because the manufacturers know what happens in turbulence.

So you've paid extra for a part that shines on the ground and misbehaves in the air. That's not a
trade I want to sell to anyone.

I'm not alone here, either. Another pilot in that thread had built himself an IMU-filtered vario and
landed in the same place: *"it's not that important and it can lie to you in rough air. I would even
say maybe it's better to have a vario without it, or the option to deactivate it."*

## If you do want fusion, do it on the phone

None of this means sensor fusion is wrong. It means the IMU is in the wrong box.

Your phone already has an accelerometer, a gyroscope and a magnetometer, plus enough compute to run
a proper filter. Apps already do this — XC Vario (theFlightVario), for instance, fuses IMU data with
barometric readings specifically to kill lag and false-lift artefacts.

And the fusion maths doesn't care where the pressure signal came from. A complementary or Kalman
filter takes short-term response from integrated acceleration and long-term drift correction from
the barometer; all it cares about is update rate and noise characteristics. Feed it a clean 10 Hz
external baro stream instead of the phone's own stuttering one and you get a *better* result than
either device alone — instant response from the IMU, honest reference from a sensor that was read
properly.

That's the split I like: the hard-real-time job on dedicated silicon, the maths where there's a CPU
and a screen and a developer who can iterate on it weekly.

## What this costs to run

Numbers from the FANET Vario, since this is where the design pays off:

- ~5 mA average in normal vario use.
- ~100 mA peak, briefly, during a FANET transmit.
- With a ~900 mAh cell, that's effectively bottomless. Disconnected and silent, it runs for months.
  I don't switch mine off — it just stays on and stays connectable.

For contrast, my [mini BT](/blog/flybeeper-mini-bt/) runs a full season on a single CR2032 while
streaming pressure at 10 Hz over Bluetooth on top of driving audio. That's what fanatical
low-power firmware buys you, and it's the first thing an IMU would take away.

Energy efficiency is the least glamorous part of this work and the part I obsess over most. It's
also the part that decides whether a device can be solar at all — and solar is the difference
between an instrument you clip on and forget, and one more thing to charge tonight.

## Where I landed

One job, done properly: a clean, fast, well-filtered barometric signal, produced by hardware that
isn't distracted, and handed to your phone as a standard BLE characteristic that any app can read.

No GPS, because your phone has one. No screen, because your phone has one. No accelerometer,
because the phone has a better one and a better place to use it.

That's not minimalism for its own sake. Every part I leave out is weight, power and a failure mode
I don't ship — and it's why the [FANET Vario](/blog/flybeeper-fanet-vario/) weighs 29 g and charges
itself.

*Questions, disagreements, or field data that contradicts any of this — I'd genuinely like to hear
it. I'm at hello@alpisto.eu.*
