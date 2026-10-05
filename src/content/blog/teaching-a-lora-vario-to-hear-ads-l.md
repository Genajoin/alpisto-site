---
title: "Teaching a LoRa vario to hear ADS-L, and finding the time to do it"
description: "An ADS-L receiver must know when each UTC second starts, and receivers normally get that from GNSS. My vario has no GNSS on purpose: its position comes from the pilot's phone. So I took the time from the phone too, over Bluetooth, and measured how accurate that is. It is accurate enough, with room to spare: the share of frames the device caught went from 15 % to between 50 and 100 %."
pubDate: 2026-08-25
tags: ["flybeeper", "fanet", "ads-l", "sx1262", "gfsk", "ble", "time-sync", "nrf52", "zephyr", "ogn", "paragliding", "hardware"]
draft: false
heroImage: "/img/blog/teaching-a-lora-vario-to-hear-ads-l/hero.png"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

In July I wrote about [where the line actually is](/blog/flarm-fanet-ads-l-where-the-line-is/)
between FLARM, FANET and ADS-L. I ended with a promise: ADS-L goes on as soon as it is worth
switching on. This month I found out what that takes.

My vario talks FANET over LoRa, a long-range, low-power radio technique. Teaching it to also hear
ADS-L turned out not to be a radio problem. The radio took a week. What decided whether any of it
worked was a clock, and my device does not have one.

So this is a lab notebook. Two boards on a desk, a metre apart. One transmits, the other only
receives.

## What ADS-L is, and why a paraglider pilot should care

ADS-L is Europe's open system for light aircraft to broadcast their position so that others can see
them. EASA, the EU aviation safety agency, publishes the specification. Anyone may implement it, and
there is no licence to negotiate. FLARM, the collision warning system that gliders carry, is the
opposite on exactly that point. The part of ADS-L that concerns me is
[ADS-L 4 SRD860](https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2022024r),
currently Issue 2.

Why should a paraglider pilot care? Because of who else is in the air. FANET shows you other
free-flight pilots. It shows you nothing about the sailplane heading into your thermal, because
gliders do not speak FANET. ADS-L is the language gliders are being pointed towards.

It is also closer than it looks. That was the point of the July article. Open Glider Network (OGN)
stations, ground receivers spread across Europe, already decode ADS-L. The PowerFLARM modules that
gliders already carry are getting ADS-L transmission as a paid extension. And ADS-L runs on
868 MHz, the band my radio already uses. So this is firmware work, not a new board.

## Everything in ADS-L depends on the start of the second

Here is the ADS-L radio scheme in short.

There are two channels, 868.2 and 868.4 MHz, and transmissions alternate between them. Aircraft
transmit only in a fixed time window, from 450 to 1000 ms after the start of each UTC second. UTC is
the world's reference time, and a UTC second is one whole second on that clock. The standard calls
this window the Direct slot (section `C.5`). A slot is simply a reserved time window. The standard
also says that no position may go on the air more than 500 ms old (`G.1.16`).

For a receiver, this is useful. All the traffic arrives in a little over half of each second. The
rest of the second is empty. If you listen during the busy half, you hear everyone. If you listen at
the wrong moment, you hear almost nobody, however long you listen.

The standard is direct about where a transmitter gets its time: "an accurate time base, e.g.
obtained from a GNSS source or a network". GNSS is satellite navigation, such as GPS or Galileo.
Everyone uses it, because a GNSS receiver gives out a pulse every second that is accurate to tens
of nanoseconds.

So a receiver needs one number: when the current UTC second began. It needs it much more precisely
than 550 ms, the length of the slot.

## My device has no GNSS, and that is deliberate

The [FANET Vario](/blog/flybeeper-fanet-vario/) has no satellite receiver. The position it
broadcasts comes over Bluetooth from the phone in your harness. That is the founding decision of the
product line. A GNSS chip costs milliamps, grams and euros, only to duplicate a receiver the pilot
already carries.

But it means the device has no source of accurate time. Without it, a receiver can only sweep: it
moves its listening window across the second, so that it at least hits the busy half now and then.
Spending a third of every second this way catches about 15 % of the traffic. The rest arrives while
the receiver is listening to the empty half.

The fix is almost embarrassingly obvious. The phone knows UTC. The phone is already connected. So
let the phone send the time along with the position.

The question then is this. Bluetooth Low Energy (BLE) is the low-power Bluetooth that phones use to
talk to small devices. Can the start of a second travel over a BLE link accurately enough to place a
550 ms window?

## The short answer

Yes, with room to spare.

I synchronised the device from a phone running my app. The device's idea of UTC landed within 2 ms
of the phone's. It was 0.0 ms off right after syncing, and 1.9 ms off a minute later, with no drift
correction at all. In a 550 ms window, that error loses 0.4 % of the traffic. The worst case I could
construct was a slow link and ten minutes without a resync. Even then the error stays under 80 ms,
which loses 15 % of frames.

On the bench, the share of transmitted frames the receiver caught went from 15.6 % to between 50
and 100 %, for the same share of listening time.

The rest of this article is how I measured those numbers, and the two ways I fooled myself first.

## One radio, two protocols

First, a correction. I have said before, carelessly, that "the chip is either a LoRa receiver or a
GFSK receiver, never both". LoRa and GFSK are two different ways of putting data on a radio wave.
FANET uses LoRa, ADS-L uses GFSK. My sentence is true of my hardware, but not of radios in general.

My radio chip, the SX1262, has a single receive path: one route from the antenna to one
demodulator, the part that turns the signal back into bits. So it can receive only one packet type
at a time. Chips and modules with two receive paths do exist, and they really do hear both. They
cost more money, more board space and more current. That is why they are not in a solar instrument
that lives off a small panel.

So on my device FANET and ADS-L take turns, and taking turns costs packets from both. If
"FANET + ADS-L" ever appears on a product page, that sentence will go next to it.

To manage the turns, the radio code got a scheduler: a table of time slots and a timer. Switching
between protocols takes time, so first I measured 73 switches.

| Transition | Measured |
|---|---|
| FANET → ADS-L (reconfigure, start receiving) | 8148…8210 µs |
| ADS-L → FANET (restore config, restart receiving) | 13763…14374 µs |

Two switches a second take about 22 ms of every second. During that time the radio listens to
neither protocol. The switch time repeats to within tens of microseconds, which matters later.

I made the cycle deliberately not a multiple of one second: 900 ms of FANET, then 400 ms of ADS-L.
That way the ADS-L window drifts across the second instead of sitting in the same part of it
forever. With no clock, sweeping is the honest strategy.

It also sets a hard limit. Spending 31 % of every second on ADS-L caught 28 frames out of 180, which
is 15.6 %. Listening more would not fix that. The problem was never how much you listen. It is when
you listen.

## How good a clock channel is Bluetooth?

Before synchronising anything, I measured the link itself. I added a ping command. The host, a
laptop or a phone, sends a command code and a sequence number. The device replies with two
timestamps from its own clock: the moment it first touched the request and the moment it last
touched it. The difference between them is the device's own processing time, and the host subtracts
it. This is the same maths that NTP, the protocol computers use to set their clocks over the
internet, is built on:

```
RTT_net = (t_recv − t_send) − (t_dev_tx − t_dev_rx)
θ       = ((t_dev_rx − t_send) + (t_dev_tx − t_recv)) / 2
```

RTT_net is the round-trip time of the link alone: how long a message takes to reach the device and
come back, minus the device's processing. θ (theta) is the clock offset: the device's clock minus the
host's. I take θ from the fastest exchanges in a run. When a link is not equally fast in both
directions, the fastest exchanges are the least wrong.

![Bar chart of Bluetooth LE round-trip time, device processing removed, for four link configurations](/img/blog/teaching-a-lora-vario-to-hear-ads-l/ble-rtt-by-link.svg)
*Same firmware, same command, four transports. The bars measure the link, not the device.*

One simple rule explains the whole chart: the round trip takes about twice the connection interval.
The connection interval is how often two BLE devices agree to exchange data. Force the link to a
7.5 ms interval, and the median round trip drops to 17.9 ms. Let the firmware ask for its preferred
30–50 ms, and it jumps back to about 70 ms. A phone follows the same rule. Asking Android for a
high-priority connection cut the median from 83.6 to 40.5 ms.

Two numbers did not change. Processing on the device took 122 µs median and 336 µs at worst, which
is invisible next to the link. And nothing was lost: about 5800 pings on the bench and 858 more from
the phone, and not one was dropped. Bluetooth here does not lose messages. It is just late, and late
by uneven amounts.

Then the crystals. Each device keeps time with a small quartz crystal, and no crystal is exact. The
error is measured in ppm, parts per million. One of my devices runs 26 to 29 ppm slow, the other 73
to 82 ppm fast. That is 105 ppm apart, which is ordinary for a 32.768 kHz watch crystal. On the
worse unit it adds up to 5 ms a minute.

One trap cost me an afternoon. If you estimate that drift rate from a short burst of pings, you get
garbage. The error in θ is not smooth random noise. It comes in steps set by the connection interval,
so a least-squares line fitted to a short burst describes those steps, not the drift. One burst gave
−896 ppm. The device dutifully corrected for it and drifted 134 ms in 150 seconds, far worse than no
correction at all. The fix is a sanity check: fit only runs of 30 seconds or longer, and reject any
result beyond ±200 ppm.

So the total error has three parts:

| Part of the error | Default link (interval 30–50 ms) | Fast link (interval 7.5 ms) |
|---|---|---|
| Fixed error because the link is not equally fast both ways (±RTT_net_min / 2) | ±28…34 ms | ±7.7 ms |
| How much θ varies across the best samples | 1.7…8.4 ms | 1.4 ms |
| Drift until the next resync (82 ppm, worse unit) | 4.9 ms/min | 4.9 ms/min |

The receive window is exactly as long as the slot, so there is no spare margin to hide in. An error
of *e* loses *e*/550 of the traffic.

So is Bluetooth good enough as a clock channel? Yes. On the slow link, with no resync for ten
minutes, the three parts add up to under 80 ms. That costs at most 15 % of frames. On a fast link
with a resync once a minute, the total is about 10 ms, or 2 %.

## A clock inside the device

The device keeps two numbers: an offset and a rate. Its uptime is its own counter of time since it
was switched on. The host tells it: "at your uptime X, my UTC was Y". The device stores the
difference, which is the offset. It also stores how many ppm fast its own clock runs, which is the
rate. When asked for the time, it answers:

$$ \text{UTC}(t) = t + \text{offset} - \text{rate}\cdot(t - t_{\text{sync}}) $$

All of this is in microseconds, stored as 64-bit numbers. That is needed because the uptime stamps
sent over the link are only the lower 32 bits of a counter, and that counter wraps around every
71.6 minutes. The device restores each full value by picking the candidate nearest to the current
time.

I measured the residual: the device's estimate of UTC minus the host's, at the same instant.

| Device | Right after sync | ~155 s later, no rate correction | ~155 s later, with it |
|---|---|---|---|
| Unit 1 | −0.1…−0.7 ms | +13.3 / +13.0 ms | +5.4 ms (rate +55 ppm) |
| Unit 2 | −0.0…−1.0 ms | −11.1 / −6.7 ms | −0.0 ms (rate −38 ppm) |

Unit 1 drifting +13 ms in 155 seconds is about +85 ppm. It is the same unit that measured +73 and
+82 ppm in the ping runs. Different method, same crystal, same answer.

Two mistakes in method turned up on the way. Both produce beautiful wrong numbers.

The first: a residual measured against an old θ means nothing. The conversion from device uptime to
host time drifts at exactly the same rate as the device's clock. The two cancel out, and the
measurement shows the correction itself instead of its result. So every drift check starts with
fresh pings.

The second: "now", used to work out when the window opens, must be read after the radio switch, not
before. I was reading it before. So the 14 ms switch back was taken out of the deadline, the window
opened 13 ms late, and the start of the Direct slot was lost. I only caught it because the first
aligned run measured 531 ms of reception instead of 551.

![Diagram of one UTC second showing the ADS-L Direct slot from 450 to 1000 ms, the receive window opened 9 ms early, and FANET holding the radio for the rest of the second](/img/blog/teaching-a-lora-vario-to-hear-ads-l/utc-second-window.svg)
*One second of radio time, aligned. The dark slivers are the switches.*

With that fixed, the window now opens 9 ms early. The switch takes 8.1 to 8.2 ms, and the receiver
must already be listening at 450 ms. The device gets 550.9 ms of real reception per window, once
every 1000.2 ms. The other 440-odd ms of each second go back to FANET.

## What the alignment bought

Same bench, same transmitter: a development kit sending one frame a second at −9 dBm, on 868.2 MHz
only. Each run is 180 frames.

| Run | Receiver mode | Time on ADS-L | Frames caught |
|---|---|---|---|
| A | sweeping 900/400 ms cycle, both channels, no alignment | 31 % | 28/180 = 15.6 % |
| B | aligned every second, both channels | 55 % | 90/180 = 50.0 % |
| C | aligned every second, one channel | 55 % | 180/180 = 100 % |
| D | aligned every other second, one channel | 28 % | 90/180 = 50.0 % |

![Bar chart comparing time spent on ADS-L against frames caught for runs A to D](/img/blog/teaching-a-lora-vario-to-hear-ads-l/catch-rate-runs.svg)
*Grey is how much of each second the radio spent on ADS-L; orange is what came back for it.*

From A to C the catch rate goes from 15.6 % to 100 %, for the same order of listening time. Not one
frame was dropped in any run. A CRC is a checksum that detects damaged packets, and not one CRC check
failed either.

B is half of C for a simple reason. Half of B's windows listen on 868.4 MHz, but my bench
transmitter only uses 868.2. Real aircraft alternate channels frame by frame. So in the air, a
receiver that alternates and a receiver that stays on one channel both catch about half. C's 100 %
is a bench artefact. B's 50 % or so is the number to expect.

D is the interesting one. It spends half as much time on ADS-L and gets the same catch rate. The
whole gap between its windows goes back to FANET.

Then the test that matters: a phone instead of a laptop, my app instead of a Python script, and
Android's scheduler competing for every packet. The phone synchronised the device to 0.0 ms residual
straight away, and 1.9 ms after a minute, with no rate correction. Aligned windows opened about
0.6 times per second. And the transmitter's aircraft appeared on the map in the app. That position
was decoded from a frame a vario caught in a 550 ms window, aimed with a clock it got over
Bluetooth.

The catch rate there was about 26 %, which is exactly as expected. Listening every other second
halves it. Alternating channels halves it again, because the transmitter only ever uses one of the
two.

The radio work was a week of opcodes. The clock work was three days of not believing the first
number I got.

## What is next, and what I have not solved

Transmitting is the next step. I am not closing that door. What blocked it was never the radio. It
was the lack of a UTC second I would stand behind, and that is exactly what this month produced.

The rest of that question is about regulation, not engineering. ADS-L itself is open: unlike FLARM,
there is no licence to negotiate, and that point is settled. But a device sold in the EU that
transmits on 868 MHz has to meet the ETSI requirements under the Radio Equipment Directive. ETSI is
the European body that writes these radio standards. The device must keep to duty cycle limits,
that is, limits on how much of the time it may transmit, and must share the band politely. And it
must carry a declaration of conformity with my name on it. I am an engineer, not a lawyer.

Field trials come first anyway. Everything above is one cooperative transmitter on a desk. Real
traffic arrives at the noise floor, barely above the background noise, from aircraft that each have
their own idea of when the second starts. Until I have flown with it, the honest claim is "it decodes
ADS-L on the bench", not "it sees gliders".

Channel switching should also get smarter. Two windows inside one second, from 450 to 725 ms and
from 725 to 1000 ms, would cover both channels every second instead of every other second. The cost
is two extra switches per second, about 22 ms per second.

And FANET is next in line for the same treatment. For ADS-L I built a command channel between the
phone and the device: typed commands, typed notifications, and a reserved byte for the regional
profile. That is the shape the FANET side should have had all along.

## For the curious: what the radio had to be talked into

You do not need this section to follow the rest of the article.

ADS-L's M-band uses plain 2-GFSK, which the SX1262 handles perfectly well. But three details are not
built into the chip.

Manchester coding. This scheme sends every bit as a pair of opposite bits. The older SX1276 chip did
it in hardware. The SX1262 does not, so it is done in software, and every buffer doubles in size.

The preamble. This is the fixed pattern at the start of a packet that tells the receiver a packet is
coming. The ADS-L preamble ends in `1001 1001`, and the chip's preamble detector, which looks for
`0x55`/`0xAA`, will never match it. A sync word is the pattern the chip waits for before it starts
recording a packet. The trick is to make that last preamble byte the first byte of a five-byte sync
word, `99 95 A6 9A 65`. Its other four bytes are `0x724B` after Manchester coding.

The checksum. ADS-L uses a CRC-24 on the Mode-S polynomial. It sits inside the Manchester-coded data,
together with the length field, where the chip's packet parser can reach neither of them. So the
hardware CRC is off, the chip receives a fixed 60-byte block, and software cuts it down to size.

The payload is scrambled with XXTEA. That sounds like security, but it is not. At key index 0 the
key is all zeros, and the algorithm is printed in the standard. It is obfuscation: a damaged packet
comes out obviously wrong.

Then the software. There are three layers of it, and each one is built only for LoRa. Zephyr is the
operating system the firmware runs on. Its `lora_modem_config` has no GFSK field at all. The driver
below it hardcodes `MODEM_LORA` in eight places and restarts reception by itself. The Semtech layer
below that does have a GFSK path, but it is set up for LoRaWAN: the wrong Gaussian filter, a
three-byte sync word, whitening on, and the wrong CRC. So I drove the chip with my own commands.
They go over SPI, the wired link between the processor and the radio chip, which the firmware
already used for FANET's sync word.

The first frame from end to end was undramatic in the best way. 15 blocks in, 15 decoded, zero CRC
failures, zero Manchester errors, and a signal strength (RSSI) of around −56 dBm. Frames reach the
phone raw, with the CRC already checked. Descrambling and parsing happen in my app, where protocol
knowledge can be updated in an afternoon.

## Where this runs

The bench work ran on my [FANET bridge](/blog/flybeeper-fanet/) boards and a Nordic dev kit. They
have the same nRF52832 processor and SX1262 radio as the [FANET Vario](/blog/flybeeper-fanet-vario/).
Its firmware now builds with all of this inside it, switched off. If you want the part I actually
ship today, a solar FANET beacon and barometric vario, it is
[on sale](https://market.flybeeper.com/device/fanet-vario).

*If you work with ADS-L, OGN or M-band receivers and something above looks wrong, especially the
reading of the Direct slot or the clock budget, I would genuinely like to know: hello@alpisto.eu.*
