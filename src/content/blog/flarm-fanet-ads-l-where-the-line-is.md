---
title: "FLARM, FANET and ADS-L — where the line actually is"
description: "Why I won't ship FLARM on hardware that could technically transmit it, what the licence actually permits, why FANET's adaptive interval matters in a gaggle, why LoRa means FANET can never be the EU conspicuity standard — and why ADS-L is a better bet than it looks."
pubDate: 2026-07-30
tags: ["flybeeper", "fanet", "flarm", "ads-l", "lora", "conspicuity", "ogn", "paragliding", "hardware"]
draft: false
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

Every time I show a FANET device to pilots, someone asks the same reasonable question: *this is
nice, but what about gliders? Why not FLARM?*

The honest answer takes more than a sentence, because there are three protocols involved, they do
different jobs, and the reason I don't ship one of them is legal rather than technical. My hardware
doesn't know or care what it transmits — it sends bytes. The choice about which bytes is mine, and
I want to explain it properly.

*Standard disclaimer: I'm an engineer, not a lawyer. What follows is how I read the licences and
the standards, and why I made the calls I made. If you're building something commercial, get your
own advice.*

## What FANET is genuinely good at

FANET is pilot-to-pilot. You appear on the instruments of every pilot around you who speaks it, and
they appear on yours. In a busy thermal or on a committing XC line, that's the cheapest safety
there is — and because FANET also carries climb data, a screen full of nearby pilots doubles as a
map of where the lift is.

The part that almost nobody outside the protocol notices is how it shares the air.

### The adaptive interval — the rule the DIY firmwares break

FANET scales its transmit rate to how crowded the sky is. From the spec, the tracking interval is:

$$ t = \left\lfloor \frac{n_{\text{neighbours}}}{10} + 1 \right\rfloor \cdot 5\ \text{s} $$

More neighbours, less often each device talks, and the shared channel stays usable for everyone.

Plenty of hobby firmwares skip this and simply beacon at a fixed interval. On a quiet hill you'll
never notice. Put fifteen of them in one gaggle and they will eat the LoRa channel between them —
and the pilots whose positions stop getting through are the ones you were hoping to see.

LoRa's usable bandwidth is genuinely tiny. The adaptive scheme isn't politeness; it's the thing
that makes the protocol work at density. If you're flying a self-built beacon, this is the one
detail worth checking in your firmware.

### And stock firmwares leave most of FANET on the table

Basic implementations do position beaconing and stop there. The protocol can also broadcast your
name, share a thermal you've found, carry weather-station packets, declare your activity type
(paraglider, sailplane, walking) and send an SOS. That last one deserves far more attention than it
gets — it's a distress beacon that's already in the radio you're carrying.

## FLARM: receiving is fine, transmitting is the line

FLARM is a licensed, protected protocol, and this is where people get into trouble without meaning
to.

The open implementations floating around these devices are older protocol versions obtained by
reverse engineering. The licence is explicit that non-commercial use is receive-only;
transmitting is carved out and requires a commercial licence plus an assigned radio ID. So the line
is sharp and it's not where most people assume:

- **Reading and decoding FLARM — fine.** That's how every OGN ground station works.
- **Transmitting a FLARM packet — that's the infringement**, old protocol version or new.

FLARM did change its update policy so that newer versions stay backwards-compatible with older
ones, which is a clever bet for anyone running reverse-engineered code: technically, an old packet
still gets received. Two caveats. FLARM also says older protocol versions get deprioritised by the
network over time, so "never needs updating" holds today but isn't promised forever. And more to
the point — a compatibility policy says nothing about the licence. Technical compatibility and
permission are different questions, and only one of them is settled by that blog post.

### The legal route, and why it's not free either

You *can* have both in one box, legally: buy the licensed FLARM OEM module and embed it. That's
what the reputable European manufacturers do.

It brings its own headache. The FLARM part is a separate chip with its own firmware on its own
update schedule, and I've watched plenty of devices walk straight into that maintenance pain — a
device that needs two firmware update paths, one of which you don't control, tends to age badly.

### Why I won't do the other thing

My radio could physically push FLARM-format packets. I deliberately don't.

Not because the code is hard — the relevant part is short and cheap to run. Because the moment you
*sell* a device that transmits FLARM without a licence, you've inherited a problem that a DIY
project simply doesn't have. A hobby firmware ships with nobody carrying liability, and for a
personal build that's completely fine. A product sold in the EU as a flight instrument doesn't get
that exemption.

So the gap in the market that people keep pointing at — cheap standalone FLARM — is a legal gap, not
a technical one. Which also means it can't be closed by better engineering.

### In fairness to FLARM

One thing worth saying, because it gets unfairly kicked around in paragliding circles: FLARM's
fixed ~1 s beacon interval is entirely correct for what it was designed for.

FLARM is built for gliders and powered aircraft. They fly far more spread out, the spacing between
them is much larger, and the transmit power isn't high enough for them to meaningfully step on each
other. Fixed-rate beaconing is the right answer there. It's paragliders thermalling wingtip to
wingtip in a tight gaggle where it falls apart — and that specific case is exactly what FANET's
adaptive interval was designed for.

Different problems, different answers. Neither protocol is stupid.

## ADS-L is closer than it looks

The usual objection is that ADS-L is years away. From the pilot's seat it certainly looks that way.
From the radio's side it looks different:

- FLARM's own PowerFLARM OEM modules are gaining ADS-L transmit on 868 MHz as a paid extension. The
  very modules people buy *for FLARM* are quietly becoming ADS-L transmitters.
- OGN ground stations across Europe already decode ADS-L and feed the network.

So the receive infrastructure exists and the transmit installed base is arriving through the back
door. What's missing is industry actually shipping it at volume — the protocol itself is done.

For me, ADS-L is a software question on hardware that's already capable. That's a much better place
to spend effort than reverse-engineering my way around a licence, and if the bet is wrong it costs
me time rather than someone else's legal exposure.

## The thing nobody mentions: LoRa is proprietary at the bottom

There's a structural reason FANET can't become the European conspicuity standard, and it has
nothing to do with the protocol's quality.

FANET rides on LoRa, and LoRa's physical layer is proprietary to Semtech — patented, second-sourced
only under licence. So FANET is open at the application layer and closed at the silicon. You can
read the spec, implement it, register a manufacturer ID (mine is `0x0B`, FlyBeeper, in the
[allocation list](https://github.com/3s1d/fanet-stm32/blob/master/Src/fanet/radio/protocol.txt)) —
and still not be standing on an open foundation.

A conspicuity standard that regulators lean on can't be built on one vendor's PHY. That's not a
knock on FANET; it's a reason to be clear-eyed about which layer it occupies.

## How I actually think about the three

- **FANET — the social layer between pilots.** Where you are, where the lift is, who's around, SOS.
  This is what my devices do today.
- **ADS-L — the interoperability layer** with gliders and general aviation. Open, decoded by OGN
  already, ready in my hardware when it makes sense to switch it on.
- **FLARM — the incumbent** for gliders, excellent at its job, and not something I can legally
  transmit. I'll receive it and respect it; I won't ship it.

Not one replacing another. FANET doesn't make you visible to a glider, and I've never claimed it
does — anyone flying where FLARM is effectively mandatory should carry FLARM.

## What my hardware does about it

The [FANET Vario](/blog/flybeeper-fanet-vario/) and the
[FANET bridge](/blog/flybeeper-fanet/) are deliberately dumb radios: the packet encoding happens in
the app, not in my firmware. The firmware exposes the device's real, registered manufacturer ID
over BLE so an app doesn't have to invent one — that's how my own app and LK8000 do it, and there's
a draft implementation in XCTrack doing the same.

That design has a consequence I should state plainly: an app author could put whatever they like
into a packet, including formats I've chosen not to support. I don't provide that, and whoever
presses transmit owns what goes out. What I control is what I build and what I ship — and what I
ship is FANET today and ADS-L the moment it's worth switching on.

*If you know this stack better than I do — especially if you think I've got the licence reading
wrong — I'd like to hear it: hello@alpisto.eu.*
