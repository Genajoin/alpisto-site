---
title: "One radio, two networks: how my FANET vario splits each second with ADS-L"
description: "My vario has one radio and two networks to serve. Every second it has to decide which network to listen to and when to transmit, and that decision affects who you see on the map. Bench results: if the vario listens to ADS-L for the whole second, FANET reception drops to zero; if it stops listening to ADS-L, it receives 40 to 140 % more FANET frames; if the ADS-L listening window is cut from 550 to 300 ms, the share of seconds in which another maker's transmitter is heard falls from 61 % to 34 %."
pubDate: 2026-09-23
tags: ["flybeeper", "fanet", "ads-l", "fanet-vario", "sx1262", "softrf", "ogn", "time-sync", "paragliding", "hardware", "measurement"]
draft: false
heroImage: "/img/blog/one-radio-two-networks/hero.png"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

This article is about two radio networks. FANET is a network that paragliders use to share their
positions with each other. ADS-L is a standard published by EASA, the European aviation safety
agency, for light aircraft to broadcast their positions.

In August I [taught my vario to hear ADS-L](/blog/teaching-a-lora-vario-to-hear-ads-l/). At the
end of that article I promised two things. The next step would be transmitting ADS-L. And FANET
would get the same kind of timing rules I had just built for ADS-L, because that is how the FANET
side should have worked from the start.

This month I did both, and they turned out to be one problem. My vario has one radio, not two. At
any moment that radio can either listen to one network or transmit. So every second it has to
decide which network to listen to and when to transmit. The pilot never sees this decision, but it
decides who appears on the map.

This is a lab notebook again. On the desk: two of my own devices, a SoftRF board standing in for
another maker's radio, and two phones on cables. None of this has flown yet.

## How ADS-L divides a second

ADS-L is strict about time. Section `C.5` of the standard
[ADS-L 4 SRD860](https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2022024r)
splits every UTC second into three parts:

- 0 to 200 ms: reserved.
- 200 to 450 ms: for ground stations.
- 450 to 1000 ms: the Direct slot. This is when aircraft transmit.

A slot here is simply a fixed part of the second set aside for one kind of transmission.

FANET has no such rule. A FANET device transmits whenever it has something queued, at any point in
the second. Until this month mine did exactly that, even right in the middle of its own ADS-L
slot. With one radio this is more than bad manners. While the radio is sending FANET, it cannot
listen to ADS-L. While it is listening to ADS-L, it cannot send anything.

So I gave FANET its own place in the same second.

![Diagram of one UTC second: the standard's reserved part, ground station part and Direct slot; FANET transmitting in 0 to 200 ms, or in 0 to 450 ms when two or more other aircraft are heard; our own ADS-L frame at a random moment between 450 and 850 ms](/img/blog/one-radio-two-networks/second-shared.png)
*Who transmits when. The standard's division of the second on top, how I use it below.*

## Where FANET transmits now

FANET now transmits in the first 200 ms, the reserved part, where no ADS-L transmitter should be.
I call this time the FANET window. Outside the window, frames wait in the queue. Nothing is
dropped. A frame that misses the window just goes out in the next second.

Two more rules. A transmission that has started is never cut off. And the device does not start a
new one in the last 40 ms of the window, because the longest FANET frame takes 36 ms on the air.

A 200 ms window keeps out of everyone else's way. But it is also narrow, and a narrow window fills
up quickly. That is simple arithmetic, and it shaped the design.

## A random moment, not a fixed one

Inside the window each device has to choose when to transmit. There are two obvious ways.

The first way is to calculate the moment from the device's address. Each unit then always transmits
at its own fixed point in the window. Two units collide only if their points happen to be close.
This is predictable, easy to test, and looks fair.

I rejected it. A fixed point means a fixed blind spot. If my point and yours are closer than the
length of one frame, our frames collide every second for the whole flight, and neither of us ever
finds out. And the pilot who loses you from the map may be neither of us.

So each device picks a new random moment every second. Then two devices collide only now and then,
not every second. Nobody is silenced for good.

The price is that collisions now depend on chance, so here is the calculation. Two frames collide if
they start less than 36 ms apart. Call *L* the usable length of the window, which is the window
minus the last 40 ms. If start times are spread evenly over *L*, and there are *N* devices in
total, the share of one device's frames that get through is roughly

$$ \text{survival} \approx \left(1 - \frac{72}{L}\right)^{N-1} $$

<div style="overflow-x:auto">

| FANET window | usable length | 2 aircraft | 3 aircraft | 5 aircraft |
|---|---|---|---|---|
| 0…200 ms | 160 ms | 55 % | 30 % | 9 % |
| 0…450 ms | 410 ms | 82 % | 68 % | 46 % |

</div>

With just one other aircraft around, the narrow window already loses a lot. So the app widens the
window to 0…450 ms as soon as it has heard two other FANET devices in the last minute. When the sky
is empty again, it narrows the window back. The wider window uses the part of the second meant for
ground stations. That is the trade-off I chose: when other aircraft are around, pilots hearing
each other matters more than a ground station getting its messages through.

On the bench the wider window cost nothing I could measure. The two devices heard each other's
ADS-L frames 11 and 9 times, against 9 and 10 in the four minutes before. FANET reception did not
change either.

## How 50 ms silenced a device

This story is why I only trust timing after I have measured it. Two days earlier I drove with two
devices in the same car. Over eight hours, one of them received 1,932 ADS-L frames from the other.
The other received 5. Same radio, same distance, strong signals of −30 to −45 dBm.

Both devices transmitted about 470 ms into the second, just after the Direct slot opens. One of
them started listening at 450 ms. The other started at 500 ms, because an early settings profile
of mine opened its listening window 50 ms late. By the time it started listening, every frame had
already been sent. The five it did catch were frames that happened to go out late.

The fix was changing two numbers. What stayed with me is that a receiver can fail completely
without showing a single error. No lost packets, no checksum (CRC) failures, just silence. So any
radio change has to be checked from both sides: the one sending and the one receiving.

## When my own ADS-L frame goes out

That 470 ms was a problem on its own too. Two of my devices close to each other both transmitted
right after 450 ms. So they talked over each other, and over everyone else who does the same.

Now the app sends each position at a random moment between 450 and 850 ms. The cost is
freshness: the later in the second a frame goes out, the older the position inside it. Section
`G.1.16` of the standard says a position should be no more than 500 ms old when it is transmitted.
Mine are between half a second and three quarters of a second old when they go out.

I have not found a way to do much better, and I am not sure there is one. The Direct slot opens at
450 ms, so there are only 50 ms before the 500 ms limit. Switching the chip into transmit mode
takes 17 to 30 of those. And narrowing the random spread has a cost. For every 100 ms of average
freshness I win back, the device loses roughly 7 to 9 % of the frames it would receive. There are
two reasons. While it transmits, it cannot listen. And in a shorter spread, more of us land on top
of each other.

<div style="overflow-x:auto">

| Spread of our frame | Extra age | Others' frames lost to our own transmission | Collisions with 10 aircraft |
|---|---|---|---|
| 450…550 ms | 50 ms | 34 % | 31 % |
| 450…650 ms | 100 ms | 17 % | 17 % |
| 450…850 ms (now) | 200 ms | 8 % | 9 % |
| 450…1000 ms | 275 ms | 6 % | 6 % |

</div>

At 40 km/h, three quarters of a second is 8 metres. I would rather be 8 metres out of date than
invisible.

One more trap belongs here. One of my test phones keeps its system clock 3.69 seconds behind real
time, even with automatic time switched on. Before the first satellite fix, the app used to stamp
positions with that clock. The device then saw them as coming from the future and refused to send
them. Now the app takes UTC time from the satellite fix itself. But on that phone, for the first
minutes after a cold start, the transmitter quietly sends nothing.

## What listening costs

FANET now has its window and ADS-L has its slot. The next question is how much of the second to
give each network for listening. I ran the same two devices through several listening modes, a few
minutes each. The SoftRF board next to them was transmitting ADS-L. My own devices lay still on the
desk, so they sent ADS-L at the rate used on the ground: once every ten seconds.

For the SoftRF I count seconds, not frames. A second counts as heard if at least one of its frames
was received. The SoftRF sends about two frames a second.

Evening of 22 September, four minutes per mode:

<div style="overflow-x:auto">

| Listening mode | My devices hear each other (each way) | SoftRF seconds heard | FANET frames received |
|---|---|---|---|
| Direct slot, every other second | 9 of 24, 10 of 23 | no transmitter yet | 20, 19 |
| the same, FANET window 0…450 | 11 of 24, 9 of 25 | 53 to 56 % | 19, 19 |
| Direct slot, every second | 7 of 24, 7 of 23 | 58 to 63 % | 16, 11 |
| the whole second | 9 of 23, 12 of 23 | 81 to 86 % | 0, 0 |

</div>

During the first mode and part of the second, the SoftRF had no satellite fix. Without a fix it
does not transmit.

The next day, eight minutes per mode, with the SoftRF transmitting the whole time:

<div style="overflow-x:auto">

| Listening mode | My devices hear each other (each way) | SoftRF seconds heard | FANET frames received |
|---|---|---|---|
| Direct slot 450…1000, every other second | 17 of 47, 12 of 48 | 61 to 62 % | 56, 27 |
| a shorter window, 450…750 | 14 of 47, 11 of 42 | 33 to 35 % | 50, 46 |
| no ADS-L listening at all | none | none | 80, 65 |

</div>

Three things follow from these numbers.

First, listening to ADS-L for the whole second kills FANET. FANET reception drops to zero, and it
has to: while the radio listens to one network, it is deaf to the other. This is the clearest
number in the notebook. It is also why I will never write "FANET and ADS-L" on a product page
without the word "alternating".

Second, not listening to ADS-L helps FANET a lot. With the ADS-L window switched off, the same
devices received 40 to 140 % more FANET frames. Every millisecond I give to one network is taken
from the other.

Third, other makers' transmitters do not transmit at the same moments as mine. My devices transmit
between 450 and 850 ms. So when I cut the listening window to 450…750, they heard each other
almost as well as before. But the SoftRF lost almost half of its heard seconds. On an earlier day I
had found out when it actually transmits: in the time slots of OGN (the Open Glider Network), 400
to 800 and 800 to 1200 ms, not in the ADS-L Direct slot. A receiver that listens only in the Direct
slot misses about a third of that radio's traffic. One that listens to only part of the slot misses
more.

## Can other people's equipment hear me

The SoftRF had one more job: to check that other people's equipment can hear my devices at all.
On the first day it heard nothing, which looked like bad news. Then I noticed it had no satellite
fix. Without one it neither transmits nor reports traffic. Once it had a fix, it listed both of my
devices by their ADS-L addresses in every test block. That included the block where my devices
were not listening to ADS-L at all.

This is the result I care about most. Everything else in this article is about what my device
hears. This one is about whether a sailplane pilot's radio would hear the paraglider.

## What I have not solved

My two devices hear each other in between a quarter and a half of their transmissions. I
understand half of the reason.

For every listening window, each device picks at random which of the two ADS-L channels to listen
on. A transmitter switches between the two channels. So half of all frames go out on a channel
nobody is listening to. Listening only every other second halves that again, which gives about
25 %. That is the lower end of what I measured.

The other half I do not understand. Listening every second should have doubled the figure. It did
not move. I do not know why yet.

One idea for the channel part: choose the channel from the number of the UTC second, using one
rule that is the same for transmitting and receiving. Then two of my devices would always agree on
the channel. It would do nothing for other makers' radios, because I do not know their rule. I
would expect it to raise the figure between my own units from about 30 to about 60 %, not to 100.

And the limits of this evidence. Everything above comes from two of my devices and one SoftRF on a
desk. That is less than an hour of air time in total, at the ground rate of one frame every ten
seconds. The firmware with the FANET window is not released yet. It goes out after I have flown
with it.

## Where this runs

The devices on the desk were a [FANET Vario](/blog/flybeeper-fanet-vario/) and a
[FANET bridge](/blog/flybeeper-fanet/). Both use an nRF52832 chip with an SX1262 radio, controlled
by the FlyBeeper app on Android. The app decides the windows. The firmware keeps to them and picks
the random moments. If you want the device I ship today, a solar FANET beacon and barometric
vario, it is [on sale](https://market.flybeeper.com/device/fanet-vario).

*If you build ADS-L or FANET equipment and something above looks wrong, especially my reading of
`C.5` or the freshness budget, I would like to know: hello@alpisto.eu.*
