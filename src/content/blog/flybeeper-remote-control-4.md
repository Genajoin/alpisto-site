---
title: "FlyBeeper Remote Control 4: a Bluetooth Four-Button Remote with Multi-Year Battery Life"
description: "An always-on four-button BLE remote for paragliding flight apps. No power switch, deep-sleep when idle, automatic wake when an app connects — battery life measured in years from a single CR2032. Built on Nordic nRF52, exposes the standard Automation IO Service."
pubDate: 2023-12-22
updatedDate: 2026-05-26
tags: ["flybeeper", "rc4", "remote-control", "bluetooth-le", "nrf52", "paragliding", "hardware"]
draft: false
heroImage: "/img/flybeeper/remote-control-4/main.jpg"
ctaTarget: "/flybeeper"
toc: false
---

A small device that mounts on a paraglider's brake handles or risers and lets you control flight apps remotely over Bluetooth via four tactile buttons. There is no power switch — the device is always available for a connection. It enters active mode when an app connects over Bluetooth, then drops back to deep sleep when the app disconnects. Battery life is measured in years.

## Why this exists

Flight apps have finally started using the capabilities of modern Bluetooth — in particular, simultaneous connections to multiple peripherals. That makes it possible to split a flight rig into specialised devices: buttons on the brakes, a barometer hidden in the cockpit, an airspeed sensor lowered on a line, and a solar-powered FANET radio on the cockpit. Each of these devices can carry a power source matched to its consumption, with a service life measured in years.

Despite having multiple devices, none of them need a manual power switch. A device activates automatically when an app connects over Bluetooth (you start your flight app). When the connection drops (you exit the app), the device goes back to sleep, waking only briefly to remain discoverable. This regime lets a device run for years. Splitting the system also means you only buy what you need at a minimal price point, and you can add functionality incrementally.

## Specifications

- 4 buttons
- CR2032 power (210 mAh, 3 V)
- Approximately 3 years of battery life (3.6 µA standby — closer to 6 years; 200 µA active — about 1,000 hours)
- Bluetooth LE 5 connectivity
- Industrial nylon case, 30 mm diameter, 8 mm tall, with two 12 × 1 mm lugs for mounting. The top cover carries icons above the four tactile buttons.

## Hardware

The device is built on the energy-efficient Nordic nRF52. A circular PCB with the components on one side and a CR2032 battery holder on the other. Four miniature tactile buttons.

![FlyBeeper RC4 — PCB top view with nRF52 and four tactile buttons](/img/blog/flybeeper-remote-control-4/01-image.png)
*PCB top: nRF52 SoC and four miniature tactile buttons.*

![FlyBeeper RC4 — PCB bottom with the CR2032 holder](/img/blog/flybeeper-remote-control-4/02-image-1.png)
*PCB bottom: CR2032 battery holder.*

![RC4 assembled — first working prototype](/img/blog/flybeeper-remote-control-4/03-photo_2023-12-24_15-54-29.jpg)
*First working prototype.*

## Firmware

The device implements the standard Bluetooth `0x1815 Automation IO Service`. The characteristic `0x2A56 Digital` carries a single byte — a bitmask of button states. Every two bits encode one button, starting from the least significant. `0b00000001` means button 1 is pressed. The descriptor `0x2909 Number of Digitals` declares 4 buttons. Pressing all four simultaneously returns `0b01010101`. See the *Automation IO Service 1.0 Specification* §3.1.1 for the full state semantics. I only use `0b00` (released) and `0b01` (pressed). Notifications fire on state change, separately for press and release. This makes it possible to detect long-press, double-click and multi-key chords.

The standard `0x180F Battery Service` with `0x2a19 Battery Level` reports battery percent.

The Bluetooth link does not require authentication or pairing.

The device supports over-the-air firmware updates (OTA / DFU).

![nRF Connect — Automation IO Service bitmask from FlyBeeper RC4 (Russian UI)](/img/blog/flybeeper-remote-control-4/04-image-11.png)
*Digital characteristic (AIOS) reporting the 4-button bitmask in nRF Connect (Russian UI).*

## Enclosure

Made of homogeneous nylon, 30 mm in diameter, 8 mm tall.

![FlyBeeper RC4 enclosure mounted on a paraglider brake handle](/img/blog/flybeeper-remote-control-4/05-image-7-edited.png)
*Final enclosure mounted on a brake handle.*
