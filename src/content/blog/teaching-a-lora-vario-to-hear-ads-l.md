---
title: "Teaching a LoRa vario to hear ADS-L — and finding the time to do it"
description: "Every ADS-L receiver takes its clock from GNSS. My vario has no GNSS by design — the position comes from the phone in your harness. So I took the UTC second from the phone too, over Bluetooth, and measured how bad that channel really is. Good enough with room to spare: the share of frames the device caught went from 15 % to between 50 and 100 %."
pubDate: 2026-08-25
tags: ["flybeeper", "fanet", "ads-l", "sx1262", "gfsk", "ble", "time-sync", "nrf52", "zephyr", "ogn", "paragliding", "hardware"]
draft: false
heroImage: "/img/blog/teaching-a-lora-vario-to-hear-ads-l/hero.png"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

In July I wrote about [where the line actually is](/blog/flarm-fanet-ads-l-where-the-line-is/)
between FLARM, FANET and ADS-L, and ended on a promise: ADS-L goes on the moment it is worth
switching on. This month I found out what that costs.

It turned out not to be a radio problem. The radio took a week. What decided whether any of it
worked was a clock — and my device does not have one.

A lab notebook, then. One board transmitting a metre from another on a desk, receive only.

## ADS-L, in plain words

ADS-L is Europe's open answer to see-and-be-seen in light aviation. EASA publishes the
specification, anyone may implement it, and there is no licence to negotiate — which is exactly
what FLARM is not. The part that concerns me is
[ADS-L 4 SRD860](https://www.easa.europa.eu/en/document-library/agency-decisions/ed-decision-2022024r),
currently Issue 2.

Why a paraglider pilot should care is arithmetic about who else is up there. FANET shows you other
free-flight pilots, and nothing about the sailplane converging on your thermal, because gliders do
not speak FANET. ADS-L is the language they are being pointed at.

It is also closer than it looks, which was the argument of the July article: Open Glider Network
stations across Europe already decode ADS-L, and the PowerFLARM modules gliders already carry are
gaining ADS-L transmission as a paid extension. And it runs on 868 MHz, where my radio already
sits — firmware work, not a new board.

## Everything in ADS-L hangs on the whole second

The air interface on a napkin. Two channels, 868.2 and 868.4 MHz, alternating between
transmissions. Aircraft transmit in a window running from 450 to 1000 ms after each whole UTC
second — the Direct slot, section `C.5`. And no position may go on the air more than 500 ms old
(`G.1.16`).

From the receiver's side that says something useful. Traffic arrives in a little over half of each
second; the rest is empty. Point your receiver at the busy half and you hear everyone. Get the
phase wrong and you hear almost nobody, however hard you listen.

The standard is blunt about where a transmitter gets that second: "an accurate time base, e.g.
obtained from a GNSS source or a network". Everyone uses GNSS, which hands out a pulse per second
good to tens of nanoseconds.

So a receiver needs one number: when the current UTC second began, to much better than the 550 ms
width of the slot.

## My device has no GNSS, and that is deliberate

The [FANET Vario](/blog/flybeeper-fanet-vario/) has no satellite receiver. The position it
broadcasts arrives over Bluetooth from the phone in your harness. That is the founding decision of
the product line: a GNSS chip is milliamps, grams and euros spent duplicating a receiver the pilot
already carries.

Which leaves the clock nowhere to come from. Without one, a receiver can only sweep: let the
listening window walk across the phase of the second so that it at least visits the right part now
and then. A third of every second spent that way catches about 15 % of the traffic. The rest
arrives while you are pointed at the empty half.

The fix is almost embarrassingly obvious. The phone knows UTC. The phone is already connected. Let
it hand over the second along with the position.

So: does a whole second survive a Bluetooth LE link well enough to aim a 550 ms window?

## The answer, before the method

Yes, with room to spare.

From a phone running my app, the device's idea of UTC landed within 2 ms of the phone's: 0.0 ms
right after synchronising, 1.9 ms out a minute later with no drift correction at all. In a 550 ms
window that costs 0.4 % of the traffic. The worst case I could construct — a slow link, ten minutes
without a resync — is under 80 ms, or 15 % of frames.

On the bench the share of transmitted frames the receiver caught went from 15.6 % to between 50 and
100 %, for the same share of listening time.

The rest of this is how those numbers were measured, and the two ways I fooled myself first.

## One radio, two protocols

A correction of something I have said carelessly before: "the chip is either a LoRa receiver or a
GFSK receiver, never both". True of my hardware, not of radios in general. A single-path chip like
the SX1262 has one route from the antenna to one demodulator, so it holds one packet type at a
time. Chips and modules with two receive paths do exist and really do hear both — for more money,
board area and current, which is why they are not in a solar instrument living off a small panel.

So here FANET and ADS-L take turns, and taking turns costs packets from both. If "FANET + ADS-L"
ever goes on a product page, that sentence goes next to it.

The radio thread therefore got a scheduler: a slot table and a timer tick. Switching is not free,
so I measured 73 switches first.

| Transition | Measured |
|---|---|
| FANET → ADS-L (reconfigure, start receiving) | 8148…8210 µs |
| ADS-L → FANET (restore config, restart receiving) | 13763…14374 µs |

Two switches a second is about 22 ms of every second spent being neither protocol, repeatable to
tens of microseconds — which matters later.

The cycle was deliberately not a multiple of a second — 900 ms of FANET plus 400 ms of ADS-L — so
that the listening window walks the phase of the second instead of parking in one part of it
forever. With no clock, sweeping is the honest strategy.

It also sets the ceiling. Spending 31 % of every second on ADS-L caught 28 frames out of 180 —
15.6 %. More duty cycle cannot fix that. The problem was never how much you listen. It is when.

## How bad a clock channel is Bluetooth?

Before synchronising anything, measure the transport. So I added a ping: the host writes an opcode
and a sequence number, and the device replies with two timestamps of its own, taken at the first
and the last instant it touches the request. Their difference is the device's own processing, which
the host subtracts out. The maths is NTP with the serial numbers filed off:

```
RTT_net = (t_recv − t_send) − (t_dev_tx − t_dev_rx)
θ       = ((t_dev_rx − t_send) + (t_dev_tx − t_recv)) / 2
```

θ, the device's clock minus the host's, is taken from the fastest exchanges of a run — on an
asymmetric link those are the least wrong.

![Bar chart of Bluetooth LE round-trip time, device processing removed, for four link configurations](/img/blog/teaching-a-lora-vario-to-hear-ads-l/ble-rtt-by-link.svg)
*Same firmware, same command, four transports. The bars measure the link, not the device.*

One blunt law explains the whole chart: the round trip is about twice the connection interval.
Force the link to a 7.5 ms interval and the median collapses to 17.9 ms; let the firmware ask for
its preferred 30–50 ms and it jumps back to about 70. A phone obeys the same law — asking Android
for a high-priority connection took the median from 83.6 to 40.5 ms.

Two numbers stayed put. Processing on the device: 122 µs median, 336 µs at worst, invisible next to
the link. And losses: about 5800 pings on the bench, 858 more from the phone, not one dropped.
Bluetooth here is not lossy. It is just late, and unevenly late.

Then the crystals: one device runs 26 to 29 ppm slow, the other 73 to 82 ppm fast — 105 ppm apart,
ordinary for a 32.768 kHz watch crystal, worth 5 ms a minute on the worse one.

And one trap, which cost me an afternoon. Estimating that drift rate from a short burst of pings
produces garbage: the noise on θ is quantised by the connection interval, not Gaussian, so a
least-squares fit describes the quantisation. One burst came out at −896 ppm; the device dutifully
subtracted it and drifted 134 ms in 150 seconds, far worse than no correction at all. The fix is a
sanity gate — fit only runs of 30 seconds or more, and reject anything beyond ±200 ppm.

Three terms, then:

| Term | Default link (interval 30–50 ms) | Fast link (interval 7.5 ms) |
|---|---|---|
| Systematic, from the link's asymmetry (±RTT_net_min / 2) | ±28…34 ms | ±7.7 ms |
| Repeatability of θ across the best samples | 1.7…8.4 ms | 1.4 ms |
| Drift until the next resync (82 ppm, worse unit) | 4.9 ms/min | 4.9 ms/min |

The window is exactly as long as the slot, so there is no margin to hide in: an error of *e* loses
*e*/550 of the traffic.

Is Bluetooth good enough as a clock channel? Yes. On the slow link with no resynchronisation for
ten minutes the three terms add up to under 80 ms, which costs at most 15 % of frames. On a fast
link with a resync once a minute the budget is about 10 ms, or 2 %.

## A clock inside the device

The device keeps two numbers: an offset and a rate. The host says "at your uptime X, my UTC was Y";
the device stores the difference and how many parts per million fast its own clock runs. Asked the
time, it answers:

$$ \text{UTC}(t) = t + \text{offset} - \text{rate}\cdot(t - t_{\text{sync}}) $$

All in microseconds on a 64-bit scale, because the uptime stamps crossing the link are the low 32
bits of a counter that wraps every 71.6 minutes; the device expands each one by picking the
candidate nearest to now.

Measured as residual — the device's estimate of UTC minus the host's at the same instant:

| Device | Right after sync | ~155 s later, no rate correction | ~155 s later, with it |
|---|---|---|---|
| Unit 1 | −0.1…−0.7 ms | +13.3 / +13.0 ms | +5.4 ms (rate +55 ppm) |
| Unit 2 | −0.0…−1.0 ms | −11.1 / −6.7 ms | −0.0 ms (rate −38 ppm) |

Unit 1 drifting +13 ms in 155 seconds is about +85 ppm — the same unit that measured +73 and
+82 ppm in the ping runs. Different method, same crystal, same answer.

Two mistakes in method turned up on the way, both the kind that produce beautiful wrong numbers.

A residual measured against a stale θ is meaningless: the conversion from device uptime to host
time drifts at exactly the rate the device's clock does, the two cancel, and the metric ends up
showing the compensation instead of its result. Every drift check starts with fresh pings.

And "now", for computing when the window opens, has to be sampled after the radio switch, not
before: the 14 ms of switching back was being charged to the deadline, the window opened 13 ms
late, and the start of the Direct slot was lost. I caught it only because the first aligned run
measured 531 ms of reception instead of 551.

![Diagram of one UTC second showing the ADS-L Direct slot from 450 to 1000 ms, the receive window opened 9 ms early, and FANET holding the radio for the rest of the second](/img/blog/teaching-a-lora-vario-to-hear-ads-l/utc-second-window.svg)
*One second of radio time, aligned. The dark slivers are the switches.*

With that fixed, and the window opened 9 ms early because the switch takes 8.1 to 8.2 ms and the
receiver must be listening already at 450 ms, the device gets 550.9 ms of real reception per window
on a period of 1000.2 ms — and hands the other 440-odd ms of each second back to FANET.

## What the alignment bought

Same bench, same transmitter: a dev-kit sending one frame a second at −9 dBm on 868.2 only, 180
frames per run.

| Run | Receiver mode | Time on ADS-L | Frames caught |
|---|---|---|---|
| A | free-running 900/400 slots, both channels, no alignment | 31 % | 28/180 = 15.6 % |
| B | aligned every second, both channels | 55 % | 90/180 = 50.0 % |
| C | aligned every second, one channel | 55 % | 180/180 = 100 % |
| D | aligned every other second, one channel | 28 % | 90/180 = 50.0 % |

![Bar chart comparing time spent on ADS-L against frames caught for runs A to D](/img/blog/teaching-a-lora-vario-to-hear-ads-l/catch-rate-runs.svg)
*Grey is how much of each second the radio spent on ADS-L; orange is what came back for it.*

A to C is 15.6 % to 100 % for the same order of listening time, with not one dropped frame and not
one CRC failure in any run.

B is half of C for an honest reason: half of B's windows listen on 868.4 while my bench transmitter
only ever uses 868.2. Real aircraft alternate channels frame by frame, so in the air an alternating
receiver and one camped on a single channel both catch about half. C's 100 % is a bench artefact;
B, around 50 %, is the number to expect.

D is the interesting one: half as much time on ADS-L for the same catch rate, with the whole gap
between windows handed back to FANET.

Then the test that matters: a phone instead of a laptop, my app instead of a Python script,
Android's scheduler fighting for every packet. It synchronised the device to 0.0 ms residual
immediately and 1.9 ms after a minute, with no rate compensation. Aligned windows opened at about
0.6 per second, and the transmitter's aircraft appeared on the map in the app — decoded from a
frame a vario pulled out of the air in a 550 ms window it had aimed with a clock it got over
Bluetooth.

The yield there was about 26 %, which is exactly right: listening every other second halves it,
alternating channels halves it again, and the transmitter only ever speaks on one of the two.

The radio work was a week of opcodes. The clock work was three days of not believing the first
number I got.

## What is next, and what I have not solved

Transmitting is the next step, not a door I am closing. What blocked it was never the radio; it was
the absence of a UTC second I would stand behind, and that is exactly what this month produced.

The rest of that question is regulatory rather than technical. ADS-L itself is open — no licence to
negotiate, unlike FLARM, and that argument is settled. But a device sold in the EU that transmits
on 868 MHz has to meet the ETSI requirements under the Radio Equipment Directive, respect duty
cycle and polite spectrum access, and carry a declaration of conformity with my name on it. I am an
engineer, not a lawyer.

Field trials come first regardless. Everything above is a cooperative transmitter on a desk; real
traffic arrives at the noise floor, from aircraft with their own idea of when the second starts.
Until I have flown with it, the honest claim is "it decodes ADS-L on the bench", not "it sees
gliders".

Channel alternation should get smarter too: two windows inside one second, 450 to 725 and 725 to
1000, would sweep both channels every second instead of alternate ones, for two extra switches per
second — about 22 ms/s.

And FANET is next in line for the same treatment: the command channel I built for ADS-L — typed
opcodes, typed notifications, a reserved byte for the regional profile — is the shape the FANET
side should have had all along.

## For the curious: what the radio had to be talked into

None of what follows is needed to follow the argument above.

ADS-L's M-band is plain 2-GFSK, which the SX1262 does perfectly well. Three details are not in the
chip. Manchester coding: the SX1276 had it in hardware, the SX1262 does not, so it is a software
codec and every buffer doubles. The preamble ends in `1001 1001`, which the chip's `0x55`/`0xAA`
detector will never match — the trick is to make that trailing byte the first byte of a five-byte
sync word, `99 95 A6 9A 65`, whose other four bytes are Manchester-encoded
`0x724B`. And the CRC-24 on the Mode-S polynomial sits inside the Manchester stream with the length
field, where the chip's parser reaches neither — so hardware CRC off, receive a fixed 60-byte block,
cut it down in software.

The payload is scrambled with XXTEA, which sounds like security and is not: at key index 0 the key
is all zeros and the algorithm is printed in the standard. It is obfuscation — a corrupted packet
comes out obviously wrong.

Then the software, three layers of it, each nailed to LoRa: Zephyr's `lora_modem_config` has no
GFSK field at all, the driver below it hardcodes `MODEM_LORA` in eight places and restarts
reception by itself, and the Semtech layer below that has a GFSK path wired for LoRaWAN — wrong
Gaussian filter, three-byte sync word, whitening on, the wrong CRC. So I drove the chip with my own
opcodes over the SPI path the firmware already used for FANET's sync word.

The first frame end to end was undramatic in the best way: 15 blocks in, 15 decoded, zero CRC
failures, zero Manchester errors, RSSI around −56 dBm. Frames reach the phone raw with the CRC
already checked; descrambling and parsing happen in my app, where protocol knowledge can be updated
in an afternoon.

## Where this runs

The bench work ran on my [FANET bridge](/blog/flybeeper-fanet/) boards and a Nordic dev kit — the
same nRF52832 and SX1262 as the [FANET Vario](/blog/flybeeper-fanet-vario/), whose firmware now
builds with all of this inside it, switched off. If you want the part I actually ship today — a
solar FANET beacon and barometric vario — it is
[on sale](https://market.flybeeper.com/device/fanet-vario).

*If you work with ADS-L, OGN or M-band receivers and something above looks wrong — especially the
Direct-slot reading or the clock budget — I would genuinely like to know: hello@alpisto.eu.*
