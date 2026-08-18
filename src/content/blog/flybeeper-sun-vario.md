---
title: "FlyBeeper SunVario: the vario you never charge"
description: "A solar audio variometer the size of a matchbox that runs off a lithium-ion capacitor instead of a battery. Thirty minutes of morning sun fills it from empty; a minute on USB-C is enough for a flying day. 29 × 34 × 12 mm, 9.8 g, one button, Bluetooth to your phone."
pubDate: 2026-08-18
tags: ["flybeeper", "sun-vario", "variometer", "bluetooth-le", "solar", "supercapacitor", "paragliding", "hardware"]
draft: false
heroImage: "/img/flybeeper/sun-vario/main.jpg"
ctaTarget: "https://market.flybeeper.com/device/sun-vario"
toc: false
---

Every instrument in your flight bag has a charging ritual. The vario, the radio, the phone, the
tracker. You plug them in the night before, or you don't and you find out on launch.

The SunVario is my attempt to delete one line from that list. It is an audio variometer with a
solar panel on top and a lithium-ion capacitor inside instead of a battery — 29 × 34 × 12 mm, 9.8 g,
one button, three volume levels, Bluetooth to your phone. You do not charge it. You leave it on the
cockpit, and the sun that you are flying in keeps it running.

![FlyBeeper SunVario — first batch, black and white bodies](/img/blog/flybeeper-sun-vario/first-batch-black-white.jpg)
*First batch, printed in two colours. The layer lines will be finer on production units.*

## Why a capacitor and not a battery

Almost every solar gadget pairs a panel with a small lithium cell, and that pairing is what kills
them. The cell sits at full charge in the sun being trickle-overcharged, it accumulates cycles it
was never specified for, it loses capacity in the cold and ages faster in the heat. Two seasons in,
the "solar" device needs charging like everything else.

A lithium-ion capacitor has none of that machinery. It does not care how many times you charge it,
it does not need a charge controller deciding when to stop, and there is no chemistry quietly
degrading while it sits full. It stores less energy than a battery — about 2.5 mAh — which sounds
fatal until you measure what this device actually consumes.

The trade is real and I would rather state it than hide it: a capacitor self-discharges, so a
SunVario that spends half a year in a dark cupboard will be empty when you find it. The fix takes
less time than finding the cable would have. Put it on the windowsill while you pack.

## Charging, in the two units that matter

**Thirty minutes of sun, from flat to full.** Measured on an August morning, on a windowsill, not
in a laboratory. From completely empty, a few minutes under a midday sun already put it in working
order — you do not have to wait for full.

That is the number behind the whole design: what the panel brings in covers roughly five times what
the device draws in its hungriest state — sound at maximum, phone connected, climbing without a
break. In sunlight the device is not slowly losing ground; it is filling up while it works.

**One minute on USB-C for a flying day.** This is the one that changes how you live with the
device. There is so little charge in the whole thing — eleven coulombs, end to end — that filling it
is not a wait. You are not charging a battery, you are topping up a capacitor. Forgot about it
entirely? Plug it in while you put your harness on.

That single fact is what makes a solar instrument practical rather than anxious. The panel covers a
typical flying day outright; the capacitor carries you through a glide in shadow, a turn away from
the sun, the evening. And when neither is enough, a minute of cable puts you back in the air.

## What it does without any sun at all

Measured on a real unit, logging its own bank voltage over eight-hour runs:

- **~18 hours** beeping on its own, no phone connected.
- **8.5 hours** in a realistic flight: phone connected and streaming pressure, volume 1, climbing
  half the time.
- **5.4 hours** on the loudest setting under the same conditions.
- **52 hours** sitting silent and unconnected, waiting for you.

The full method, the discharge curves and the formula behind those numbers are in the [engineering
write-up](/blog/sun-vario-energy-budget-measured/).

## What it is like to use

One button. Press and hold to turn it on; it beeps to confirm. Press it in flight to cycle volume,
including silent. Hold it to turn it off. There is no menu, no mode you can fall into by accident,
and nothing to configure on the device itself.

Everything else lives in the web configurator: pair over Bluetooth, and you get the full set of
curves — frequency, duty cycle and period against climb rate, twelve points each — plus averaging
time, thresholds, and firmware updates over the air. If you want a "zeros" mode, you draw it as a
curve; it is the default shape.

The second way to use it is as the barometric sensor for your phone. It publishes pressure over
BLE at 10 Hz as a standard characteristic, so XCTrack, SeeYou and the rest pick it up as an
external sensor. Silence the buzzer, let the app do the audio through your headphones, and the
device is just a very good barometer that never needs charging. If the phone dies mid-flight, one
button press wakes the device's own beeper and you carry on.

There is no accelerometer, and that is deliberate — [I wrote a whole
post](/blog/why-no-accelerometer-in-my-vario/) about why an IMU costs more than it gives in a
paraglider. What you get instead is a high-sensitivity barometer polled 62 times a second by a
processor that has nothing else to do, which is where the response actually comes from.

## What it is not

- **Not waterproof.** The barometer needs open access to outside air and the piezo needs a path for
  sound; sealing both is not worth doing on a device whose barometer would be dead anyway.
- **Not specified for deep cold.** The design target is **−5 °C and up**, which covers about 95 %
  of real flying. It will very probably keep working colder than that — what it needs down there is
  sun, because the cold end is about how the capacitor behaves, not about the electronics.
- **Not a FANET tracker.** If you want to appear on the live map and see other pilots, that is the
  [FANET Vario](/blog/flybeeper-fanet-vario/) — a bigger device with a radio.
- **Not serviceable.** There is no battery to replace, which is the point, so the case is built to
  be closed and stay closed.

## Under the lid

nRF52832, an SPL07-003 barometer on SPI, a PAM8904E charge pump driving a 12 mm piezo, a 10 F
lithium-ion capacitor, USB-C, and a solar panel across the top face feeding an energy harvester
that lifts whatever the panel gives into the capacitor.

The enclosure is three printed parts: a tray, a frame that clips over the panel from outside, and a
separate strip that carries the button and nothing else — one part per job, so pressing on the
panel cannot reach the button.

If that kind of detail is what you came for, the [engineering write-up
](/blog/sun-vario-energy-budget-measured/) has the discharge curves, the runtime formula, why the
barometer turned out to cost more current than the sound, and what the enclosure went through to
get here.

## Ordering

The SunVario is **on sale now**, free shipping. The first units go out as a pre-ordered batch,
shipped in the order the payments arrive — built and sent by me, with the firmware updated over the
air as it improves.

A word on timing, because "pre-order" means different things in different shops. A few units are
built and sitting on my desk; those ship within three business days. After they are gone, your
device is built for you — boards from the factory, enclosure printed and assembled here — which
takes up to four weeks from payment. Either way you get an email within a day telling you which of
the two you are, and you can cancel for a full refund any time before it ships.

**[Order the SunVario →](https://market.flybeeper.com/device/sun-vario)** · **[Read the
engineering write-up →](/blog/sun-vario-energy-budget-measured/)**
