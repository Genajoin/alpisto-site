---
title: "See and be seen — a solar FANET vario you never have to charge"
description: "The FlyBeeper FANET Vario is a wireless, solar-powered FANET beacon and barometric variometer in one. No GPS inside — it reuses your phone's, works as a plain radio driven by the app, and puts you on the map for nearby pilots. Full app, BLE protocol and specs. A quiet pre-order at €149 with free shipping."
pubDate: 2026-07-21
tags: ["flybeeper", "fanet-vario", "fanet", "variometer", "solar", "bluetooth-le", "nrf52", "lora", "paragliding", "hardware"]
draft: false
heroImage: "/img/flybeeper/fanet-vario/main.jpg"
ctaTarget: "https://market.flybeeper.com/device/fanet-vario"
toc: true
---

Most of us fly with more instruments than we'd like: a main vario, a phone running XCTrack, cables, a battery bank, and the low-grade anxiety of watching a charge indicator on a good soaring day. The FlyBeeper FANET Vario is a small push against all of that.

It does two things, and does them without wires. First, it's a FANET beacon: it puts you on the map for every pilot around you whose instrument speaks FANET, and it puts them on yours. In a busy thermal or on a committing XC line, seeing traffic — and being seen — is the cheapest safety you can buy. FANET also shares climb data, so a screen full of nearby pilots is also a map of where the lift is. Second, it's a barometric variometer: it hears the air and tells you when you're going up, the plain, honest job a vario has always done.

The part I'm proudest of is the power. There's a solar panel across the front face, so on a normal flying day it tops itself up. No nightly ritual of plugging in yet another gadget, no dead device at launch because you forgot. You clip it on and fly.

## No GPS inside — and that's the point

I want to be honest about what's *not* in this device: there is no GPS. That's deliberate, and it's the idea behind the whole FlyBeeper line.

Every one of these instruments is built on a single principle — don't duplicate what's already in your pocket. Your phone has a genuinely good GPS, a fast processor, a large screen, an internet connection for AGPS and maps, and a battery measured in thousands of mAh. A coin-cell or solar gadget can't beat any of those. The tiny GPS modules that compact varios ship with usually have undersized antennas and weak chipsets, and they burn a lot of current for a worse fix. Trying to out-do the phone just adds weight, cost and drain.

So the FANET Vario carries only the two things a phone *doesn't* have: a long-range FANET radio and a barometric pressure sensor. Position comes from the phone, over Bluetooth. That single decision is also why it barely needs charging — without a hungry GPS running, the solar panel can keep up with the draw.

## Just a radio — the intelligence lives in the app

At its core the FANET Vario is a battery-powered radio tuned to the FANET channel, plus a barometer with a buzzer. It doesn't decide what to transmit. The app on your phone does.

The app takes your position from the phone's GPS, frames it as a FANET packet — air position, ground position, your name, a thermal you just hit — and writes it to the device over Bluetooth. The device puts those bytes on the air. Incoming packets go the other way: the radio hears other pilots and streams every received frame to the app over Bluetooth, which decodes and draws them.

Because the device is *just a radio*, it isn't boxed in by its firmware. Whatever an app developer can frame into a FANET packet — or an ADS-L packet, on the same radio — the device will transmit. New features arrive as apps evolve; the hardware clipped to your harness never has to change. From the pilot's seat it feels as if a FANET transceiver were built into the phone. All the real power lives in the app, and a great deal is possible there.

## The app: maps.flybeeper.com

FlyBeeper has its own app, [maps.flybeeper.com](https://maps.flybeeper.com). It's a web app, with a dedicated Android app as well. It's the reference for what a FANET Vario can do — but the device is a standard BLE peripheral, so other flight apps can drive it too (more on that below).

Here's what the app does with the device:

- Shows all the traffic on the map. Every FANET frame the radio hears — pilots, their climb rates, ground stations — is decoded and drawn on a MapLibre map in real time. You see the other pilots around you, and where they're going up, without any internet connection.
- Broadcasts your position. With one toggle the app encodes your GPS fix (and, if you like, your name) and hands it to the device to radiate. Now the other pilots see *you*. The broadcast rate adapts to how many neighbours are around and to battery state.
- Runs in the background on Android. In navigation mode the app keeps working with the screen off, via a foreground service and a small native engine that keeps beaconing and buffering received traffic while the rest of the app is asleep. Your phone can be in your pocket and you're still on the map.
- Can act as a base station. Switch it on and the app forwards every frame it hears up to the FlyBeeper server. Anyone who then opens the website sees the same live picture you do — you become a piece of the public FANET map. (There's also a separate *relay* mode that re-broadcasts distant pilots back over the radio to extend range — a different thing from the internet base station, but worth knowing it exists.)
- Configures the device. You set the instrument up straight from the app over Bluetooth — mostly the vario sound curves (see below), plus buzzer volume, climb/sink thresholds and the radio channel.

And the app is a full flight computer besides: a cockpit HUD with vario tape and wind/glide/altitude widgets, offline maps, airspace with proximity alerts, point weather with soundings/emagram, a thermal assistant, an emergency SOS, and track recording with private group sharing.

If you'd rather fly your usual software, that's fine too. The FANET Vario exposes a standard barometric stream and an NMEA text protocol, so xcTrack, SeeYou Navigator and LK8000 can use it as a fast pressure/vario source over Bluetooth. How much FANET each one speaks varies:

- LK8000 has full FANET support — it both shows the surrounding traffic and transmits your own position through the device.
- xcTrack reads the text protocol and already displays FANET traffic; sending your own position is an open feature request, so it may well gain that out of the box in a future release.
- SeeYou Navigator uses the device as a barometric vario source over Bluetooth.
- The FlyBeeper app does everything — display, broadcast, base station and configuration.

A word on browsers, since I'd rather be upfront than have you find out at launch. Talking to the device over Bluetooth relies on Web Bluetooth, and not every browser has it. It works in Chrome, Edge and other Chromium-based browsers on Android, Windows, macOS, Linux and ChromeOS. Firefox and Safari don't implement Web Bluetooth, so they'll show the public map but can't connect to the device. On Android there's the dedicated app as the easy path. On iOS it's the awkward one: every browser there is built on Safari's engine, so none support Web Bluetooth — to connect a device today you need a Web-Bluetooth-capable browser such as Bluefy. If you fly iPhone, check this fits your setup before ordering.

## Configure it from your phone

There's exactly one physical button on the device — hold it to power on/off, tap it for volume. Everything else is set wirelessly from the app, so there's no menu to get lost in and no way to fumble into a wrong mode at launch.

The heart of the configuration is the vario sound. It's modelled as four parallel 12-point curves keyed to climb rate: a shared *climb-rate axis* (in cm/s) and, at each of those twelve points, the beep's frequency, its period, and its duty cycle. Between the points the device interpolates. That's enough freedom to reproduce any vario "personality" you like — a lazy analogue tone, a sharp modern chirp, a distinct "zeros" region around neutral air — as a preset or fully custom, edited on the phone and previewed live before you write it to the device.

## Hardware

The device is a screwless grey brick — moulded in a UV-resistant plastic (ASA) so the sun doesn't chalk it — with the solar panel filling the front face and the antenna inside, so nothing sticks out. Inside:

- MCU: Nordic nRF52832 (Cortex-M4, Bluetooth LE), the same silicon as the rest of the FlyBeeper line.
- Radio: Semtech SX1262 LoRa transceiver on 868.2 MHz (EU FANET), configurable across 800–950 MHz for other regions.
- Barometer: Goertek SPL06 pressure sensor (being upgraded to the newer 007 part) — the vario's ears.
- Audio: a piezo buzzer driven by PWM, tuned in a small resonator chamber; tone table spans roughly 200 Hz to 6 kHz.
- Power: front-face solar panel, a small LiPo (about 900 mAh) and USB-C charging.
- Indicators: three LEDs — one for FANET activity, and two for charging (red while charging, green when full).
- No GPS, no accelerometer — by design.

Rough numbers: 29 g, 28.7 × 91.8 × 16.2 mm. Runtime is about 20 hours of active use with no sun and roughly 10 % of charge per day in normal flying — in sunlight there may be no net discharge at all. Powered off, it holds charge for a very long time. It is not water-sealed: the barometer needs open air to work, so keep it dry.

## Specs

- Radio: FANET (LoRa), 868.2 MHz default · SX1262 · internal antenna
- Vario: barometric, ±2 cm sensitivity (Goertek SPL06, moving to 007) — same sensor as the whole line
- Phone link: Bluetooth LE — pressure, vario, temperature, battery and FANET frames
- Positioning: your phone's GPS, via the app — no built-in GPS
- Audio: piezo buzzer, fully configurable 12-point vario curves
- Power: solar + ~900 mAh LiPo, USB-C charge, one button, three LEDs (FANET · charging · charged)
- Body: UV-resistant plastic (ASA), grey, screwless, 29 g, 28.7 × 91.8 × 16.2 mm
- Updates: OTA firmware over BLE (MCUboot / nRF Connect DFU)
- Not sealed: keep it out of rain and water

## For developers

The device connects over Bluetooth with no pairing or bonding — the GATT services are open. It advertises as `FBFV.XXXX`, where `XXXX` is the last four hex digits of the hardware ID (so multiple devices are distinguishable). Advertising is three-tier to balance quick reconnection against power: 100–150 ms for the first 30 s after boot / disconnect / button press, 500–600 ms for the next 90 s, then a steady ~3.5 s in the long term.

### Reading and transmitting FANET packets

FANET goes in and out through a single characteristic in the standard `LNS 0x1819` service:

`fec81438-cb89-4c37-93d0-badfced4376e` — notify + write.

Subscribe for notifications and each one is a byte array holding one received FANET frame. To transmit, write a framed payload to the same characteristic and the radio puts it on the air. Maximum frame length is 64 bytes; longer payloads are rejected. The device does no FANET-spec validation of what you hand it — generating a valid, unique packet (including the header/ID) is the app's job.

Example payload: `0x42061728536B794E65743A204B7265646172696361`.
A full protocol description is in the [FANET spec](https://github.com/3s1d/fanet-stm32/blob/master/Src/fanet/radio/protocol.txt).

### Barometric stream (the vario half)

Beyond the radio, the device exposes a full barometric stack so any flight app can use it as a pressure/vario source:

| Data | Service | Characteristic UUID | Type |
| --- | --- | --- | --- |
| Pressure | ESS `0x181A` | `00002a6d` | UINT32, ×10⁻¹ Pa · read + notify |
| Temperature | ESS `0x181A` | `00002a6e` | SINT16, ×10⁻² °C · notify |
| Vario (from pressure) | LNS `0x1819` | `b4df8385-16d2-4037-b2ed-2e14e1f4fa27` | SINT16, ×10⁻² m/s |
| Battery level | Battery `0x180F` | `00002a19` | UINT8, % |

There's also a Nordic UART service (`6e400001-…`) that emits NMEA-style sentences (`FNNGB`, `FBFAN`, `FNF`, `$LXWP0`) for apps like xcTrack, SeeYou and LK8000, and accepts text commands (`FBQNH`, `FBPDEL`, `RESET`, `INFO`).

### Radio configuration

Channel assignment varies by region, so the radio is fully configurable through the FlyBeeper Settings service `904baf04-5814-11ee-8c99-0242ac120000`. Defaults are EU (868.2 MHz):

| Setting | Type | Characteristic UUID | Range · default |
| --- | --- | --- | --- |
| frequency | UINT32 | `8d8e8809-4697-41fc-8ee2-ca0b999354ec` | 800–950 MHz · 868200000 (EU) |
| bandwidth | INT8 | `f19422e2-982a-4954-9a75-b38927236a59` | 0 = 125 · 1 = 250 · 2 = 500 kHz |
| datarate (SF) | INT8 | `108b855f-11cd-4bc5-adee-eafce49bc77a` | 6–12 = SF6–SF12 · 7 |
| coding rate | INT8 | `17a95752-3c12-438f-9244-4f4612a1ab49` | 1–4 = 4/5…4/8 · 1 |
| tx power | INT8 | `8ef0c42e-adb6-4897-b9c9-6fe93143faf4` | −9…+22 dBm · 14 |

Because the whole radio config is exposed, the device can transmit not only FANET but anything else an app frames — including ADS-L.

### Vario curves

The audio is driven by four `int16[12]` arrays over the same Settings service — a shared climb-rate axis plus frequency, period and duty at each breakpoint:

| Curve | Characteristic UUID | Default (12 points) |
| --- | --- | --- |
| Vario axis (cm/s) | `512d6d89-7a6f-461c-983e-902b68d40f56` | `-1400,-800,-100,0,39,40,100,200,300,450,1200,2000` |
| Frequency (Hz) | `8c090502-81c4-4d29-8d10-6db20607ace9` | `200,250,390,395,400,470,760,1120,1480,2020,4720,6000` |
| Period (ms) | `9c3b62c0-e227-4f1a-8342-7e647015555d` | `850,790,725,350,150,595,430,325,265,210,120,100` |
| Duty (%) | `98c16914-00ad-47ba-b625-148f0baaec47` | `100,98,95,20,80,41,43,46,49,54,78,90` |

A write-only simulation input lets an app feed the curves a climb rate for testing without real air.

### Firmware updates

Updates are over BLE: an MCUboot dual-slot bootloader with SMP-over-BLE (MCUmgr) transport, so you flash signed images from nRF Connect for Mobile — connect, DFU, done, with automatic rollback if an image fails to confirm.

**And you don't need any of that to install one.**

The configurator page talks to the device over Bluetooth straight from your browser and pushes the new firmware in about thirty seconds — no cable, no app to install, nothing to sign up for. The clip below is the whole process, unedited: connect, install, done, 185 KB over the air.

<figure style="margin: 2rem auto; max-width: 390px;">
  <video controls muted loop playsinline preload="metadata" poster="/video/fanet-vario-web-dfu.jpg" style="width: 100%; border-radius: 0.5rem; display: block;">
    <source src="/video/fanet-vario-web-dfu.mp4" type="video/mp4" />
  </video>
</figure>

One honest limitation: this works in Chrome and Edge on Android, Windows, macOS and Linux, but not in Safari on iPhone — Apple doesn't allow Bluetooth from the browser. On an iPhone you download the firmware file from the same page and install it with a free MCUmgr app. One extra step, not a dead end.

This is the part I wanted sorted before shipping the first batch. An instrument from a one-man shop should be fixable after you've bought it, not just before.

## An honest pre-order

I should be straight with you about what this is. I'm an engineer and a pilot in Tolmin, Slovenia, and FlyBeeper is my own line of small BLE instruments for free flight — designed end to end, from the Nordic firmware and the PCB to the app. The FANET Vario is new, and this is a first batch of about ten units. It's a pre-order, not a warehouse: units ship in the order payments come in. If you like backing small, well-made kit from the person who actually built it — and getting one of the first — this is exactly that.

The price is €149 with free shipping. Questions are welcome; write to me directly and a real human — me — will answer.
