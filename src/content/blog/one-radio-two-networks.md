---
title: "One radio, two networks: how a FANET vario shares every second with ADS-L"
description: "My vario has one radio and two networks to serve. Every second it decides which one to listen to and when to speak, and that choice decides who you see on the map. The numbers from the bench: listen to ADS-L for the whole second and FANET goes to zero; stop listening to ADS-L and FANET comes back 40 to 140 % stronger; cut the ADS-L window from 550 to 300 ms and another maker's transmitter drops from 61 % of its seconds heard to 34 %."
pubDate: 2026-09-23
tags: ["flybeeper", "fanet", "ads-l", "fanet-vario", "sx1262", "softrf", "ogn", "time-sync", "paragliding", "hardware", "measurement"]
draft: true
heroImage: "/img/blog/one-radio-two-networks/hero.png"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

In August I [taught my vario to hear ADS-L](/blog/teaching-a-lora-vario-to-hear-ads-l/) and ended
with two promises. Transmitting was the next step. And FANET was next in line for the same
treatment: the scheduling I had built for ADS-L was the shape the FANET side should have had all
along.

This month both happened, and they turned out to be the same problem. A vario with one radio does
not have two receivers. It has one, and every second it has to decide which network to listen to
and when to speak. That decision is invisible to the pilot, and it decides who shows up on the map.

A lab notebook again. Two of my own devices on a desk, a SoftRF board next to them as
somebody else's radio, two phones on cables. Nothing here has flown yet.

## The second, as the standard divides it

ADS-L is strict about time. Section `C.5` of
[ADS-L 4 SRD860](https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2022024r)
cuts every UTC second into three parts. The first 200 ms are reserved. From 200 to 450 ms belongs to
ground stations. From 450 to 1000 ms is the Direct slot, where aircraft transmit.

FANET has no such rule. A FANET device sends when its queue says so, at any moment of the second.
Until this month mine did exactly that, including right on top of its own ADS-L slot. With one radio
that is not a courtesy problem. While the radio is sending FANET it is not listening to ADS-L, and
while it is listening to ADS-L it cannot send anything.

So I gave FANET a place in the same second.

![Diagram of one UTC second: the standard's reserved part, ground station part and Direct slot; FANET transmitting in 0 to 200 ms, or in 0 to 450 ms when two or more other aircraft are heard; our own ADS-L frame at a random moment between 450 and 850 ms](/img/blog/one-radio-two-networks/second-shared.png)
*Who speaks when. The standard's own division on top, my use of it below.*

## Where FANET goes

FANET now transmits in the reserved first 200 ms, where no ADS-L transmitter should be. Outside
that window frames wait in the queue. Nothing is dropped, it is only delayed to the next second. A
transmission that has started is never cut off, and the device does not start one within 40 ms of
the window's edge, because the longest FANET frame is 36 ms on the air.

A 200 ms window is polite. It is also narrow, and narrow windows fill up quickly. That part is
arithmetic, and it decided the design.

## Random, not by address

Inside the window each device has to pick a moment. There are two obvious ways.

The first is to derive the moment from the device's address. Every unit gets its own fixed point in
the window, and two units only collide if their points happen to be close. Deterministic, easy to
test, and it looks fair.

I threw it out. A fixed point gives a fixed blind spot. If my point and yours land within a frame's
length of each other, we collide every second, for the whole flight, and neither of us ever knows.
The pilot who loses you from the map is not necessarily either of us who built the scheme. A random
moment, drawn afresh every second, turns that permanent collision into an occasional one. Nobody is
silenced for good.

The price of random is that collisions are now a matter of probability, so here it is. Two frames
collide if their starts are within 36 ms of each other. With starts spread evenly over a window of
usable length *L* (the window minus the 40 ms guard), the share of one device's frames that survives
next to *N* − 1 others is

$$ \text{survival} \approx \left(1 - \frac{72}{L}\right)^{N-1} $$

<div style="overflow-x:auto">

| FANET window | usable length | 2 aircraft | 3 aircraft | 5 aircraft |
|---|---|---|---|---|
| 0…200 ms | 160 ms | 55 % | 30 % | 9 % |
| 0…450 ms | 410 ms | 82 % | 68 % | 46 % |

</div>

The narrow window stops being free at the second aircraft. So the app widens it to 0…450 ms as soon
as it hears two other FANET devices in the last minute, and narrows it back when the sky is empty
again. The wider window takes the ground stations' part of the second. That is the trade: when
there are aircraft around, pilots hearing each other matters more than a ground station's uplink.

On the bench the wider window cost nothing I could measure. The two devices heard each other's
ADS-L exactly as before (11 and 9 frames against 9 and 10 in the four minutes before), and FANET
reception did not change either.

## The 50 ms that silenced a device

Why I trust the timing only after measuring it. Two days earlier, on a drive with two devices in
the same car, one of them received 1,932 ADS-L frames from the other over eight hours, and the other
received 5. Same radio, same distance, signals at −30 to −45 dBm.

Both devices were transmitting at about 470 ms into the second, just after the Direct slot opens.
One of them was listening from 450. The other was listening from 500, because an early profile of
mine opened its window 50 ms late. Every frame had already been sent by the time it started to
listen. The five it caught were the ones that happened to go out late.

The fix was two numbers. What stayed with me is how completely a receiver can fail without a single
error: no dropped packets, no CRC failures, just silence. Radio changes have to be checked from both
ends.

## Where our own ADS-L frame goes

That 470 ms was also a problem of its own. Two of my devices near each other both transmitted right
after 450 ms, so they spoke over each other and over everybody else who does the same.

The app now sends each position at a random moment between 450 and 850 ms. The cost is freshness:
the later in the second the frame goes out, the older the position in it. `G.1.16` says a position
should not go on the air more than 500 ms old. Mine are between half a second and three quarters
of a second old when they leave.

I have not found a way to do much better, and I am not sure there is one. The Direct slot opens at
450 ms. Between that and the 500 ms limit there are 50 ms, and switching the chip to transmit takes
17 to 30 of them. Every 100 ms of average freshness I win back by narrowing the spread costs
roughly 7 to 9 % of the frames the device receives, because while it is transmitting it cannot
listen, and because more of us land on top of each other.

<div style="overflow-x:auto">

| Spread of our frame | Extra age | Others' frames lost to our own transmission | Collisions with 10 aircraft |
|---|---|---|---|
| 450…550 ms | 50 ms | 34 % | 31 % |
| 450…650 ms | 100 ms | 17 % | 17 % |
| 450…850 ms (now) | 200 ms | 8 % | 9 % |
| 450…1000 ms | 275 ms | 6 % | 6 % |

</div>

At 40 km/h three quarters of a second is 8 metres. I would rather be 8 metres stale than invisible.

One more trap belongs here. One of my test phones keeps its system clock 3.69 seconds behind real
time, with automatic time switched on. Until the first satellite fix the app timestamps positions
with that clock, the device sees them as coming from the future and refuses to send them. The app
now takes UTC from the GNSS fix itself. For the first minutes after a cold start on that phone, the
transmitter quietly does nothing.

## What listening costs

With FANET in its window and ADS-L in its slot, the question becomes how much of the second to give
to each. I ran the same two devices through a set of listening modes, a few minutes each, the SoftRF
board transmitting ADS-L next to them. My own devices lay on the desk, so they sent ADS-L at the
ground rate, once every ten seconds.

The SoftRF numbers are counted in seconds: a second counts if at least one of its frames was
received. It sends about two frames a second.

Evening of 22 September, four minutes per mode:

<div style="overflow-x:auto">

| Listening mode | My devices hear each other (each way) | SoftRF seconds heard | FANET frames received |
|---|---|---|---|
| Direct slot, every other second | 9 of 24, 10 of 23 | no transmitter yet | 20, 19 |
| the same, FANET window 0…450 | 11 of 24, 9 of 25 | 53 to 56 % | 19, 19 |
| Direct slot, every second | 7 of 24, 7 of 23 | 58 to 63 % | 16, 11 |
| the whole second | 9 of 23, 12 of 23 | 81 to 86 % | 0, 0 |

</div>

The SoftRF had no satellite fix during the first mode and part of the second, and without a fix it
does not transmit.

Next day, eight minutes per mode, the SoftRF on the air throughout:

<div style="overflow-x:auto">

| Listening mode | My devices hear each other (each way) | SoftRF seconds heard | FANET frames received |
|---|---|---|---|
| Direct slot 450…1000, every other second | 17 of 47, 12 of 48 | 61 to 62 % | 56, 27 |
| a shorter window, 450…750 | 14 of 47, 11 of 42 | 33 to 35 % | 50, 46 |
| no ADS-L listening at all | none | none | 80, 65 |

</div>

Three things come out of this.

The whole second on ADS-L is a wall. FANET goes to zero, and it has to: while the radio is
listening to one network it is deaf to the other. It is the clearest number in the notebook, and
the reason I will never write "FANET and ADS-L" on a product page without the word "alternating".

Not listening to ADS-L is worth a lot to FANET. The same devices received 40 to 140 % more FANET
frames when the ADS-L window was switched off. Every millisecond I give to one network comes out of
the other.

And other people's transmitters do not live where mine do. My devices transmit between 450 and
850 ms, so cutting the window to 450…750 barely changed how well they heard each other. The SoftRF
lost almost half of its seconds. On an earlier day I found where it actually transmits: in the OGN
time slots, 400 to 800 and 800 to 1200 ms, not in the ADS-L Direct slot. A receiver that listens
only to the Direct slot misses about a third of that radio's traffic, and one that trims the slot
misses more.

## Somebody else's receiver

The SoftRF had one more job: to check that other people's equipment can hear mine at all. On the
first day it heard nothing, which looked like bad news. Then I noticed it had no
satellite fix, and without one it neither transmits nor reports traffic. Once it had a fix, it
listed both of my devices by their ADS-L addresses, every block, including the one where my devices
were not listening to ADS-L at all.

That is the result I care about most. Everything else in this article is about what my device hears.
This is about whether a sailplane pilot's radio would hear the paraglider.

## What I have not solved

My two devices hear each other in between a quarter and a half of their transmissions. Half of that is understood.
Each device picks its ADS-L receive channel at random for every window, and a transmitter alternates
between the two channels, so half of all frames go out on the channel nobody is listening to.
Listening every other second halves it again, which gives about 25 %, which is the lower end of what I measured.

The other half is not understood. Listening every second should have doubled the figure. It did not
move. I do not know why yet.

One idea for the channel part is to derive the channel from the number of the UTC second with one
rule, the same on the transmitting and the receiving side. Two of my devices would then always
agree on the channel. It would do nothing for anybody else's radio, whose rule I do not know, and
I would expect it to take the figure between my own units from about 30 to about 60 %, not to 100.

And the limits of the evidence. Everything above is two of my devices and one SoftRF on a desk, less
than an hour of air time in total, at the ground rate of one frame every ten seconds. The firmware
with the FANET window is not released yet. It goes out after I have flown with it.

## Where this runs

The devices on the desk were a [FANET Vario](/blog/flybeeper-fanet-vario/) and a
[FANET bridge](/blog/flybeeper-fanet/), both an nRF52832 with an SX1262, driven by the FlyBeeper app
on Android. The app decides the windows; the firmware keeps them and draws the random moments. If you
want the part I ship today, a solar FANET beacon and barometric vario, it is
[on sale](https://market.flybeeper.com/device/fanet-vario).

*If you build ADS-L or FANET equipment and something above looks wrong, especially the reading of
`C.5` or the freshness budget, I would like to know: hello@alpisto.eu.*
