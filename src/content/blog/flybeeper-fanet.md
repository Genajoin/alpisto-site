---
title: "FlyBeeper FANET: a Bluetooth Bridge to the FANET Radio Network"
description: "An always-on BLE bridge to the 868 MHz FANET data network. No on-board GPS — the smartphone provides position, the device just radiates. Solar-powered, years of standby, full radio configuration over GATT so apps can transmit FANET, ADS-L or anything else on the same radio."
pubDate: 2024-05-08
updatedDate: 2026-05-26
tags: ["flybeeper", "fanet", "lora", "bluetooth-le", "nrf52", "paragliding", "hardware"]
draft: false
heroImage: "/img/flybeeper/fanet/main.jpg"
ctaTarget: "/flybeeper"
toc: true
---

The latest in the line of Bluetooth peripherals that extend a smartphone into a flight rig. To recap: PS1 is the pressure sensor, RC4 is the wireless button pad, and now FANET. But this is not a typical FANET tracker. My devices share a philosophy: minimalism and maximum performance. The whole FlyBeeper line can work with the smartphone in parallel, since most apps already support multiple BLE connections. Each device does its own job efficiently. If one fails, you only lose that one function.

## How it works

FlyBeeper FANET is, at its core, a battery-powered radio tuned to the FANET data channel. To read FANET packets, an app connects over Bluetooth and subscribes to the right characteristic. To transmit a packet — your position, a thermal you just hit, your name — the app writes a properly framed payload to the same characteristic. A regular pilot does none of that, of course. The flight app does it all.

The pilot does two things: pair the device with the flight app once, then mount it. From then on, every time the app starts up it should discover, connect to, and start using the device automatically. The device requires zero interaction. It is always on and always ready for a connection. The battery is large enough to stay in that mode for years. Only after an app connects does the device start spending real current. The solar panel is sized to cover that current.

Because every smartphone already has a GPS, this device does not. An external GPS would burn a lot of power. Without internet — i.e. without AGPS — it would also perform worse than most phone GPS modules. The GPS modules that compact variometers ship with often suffer from undersized antennas and weak chipsets. Bear in mind: this device only works as a companion to a smartphone. On its own it is not a tracker — it is just a radio.

## What the user gets

Functionality is entirely up to the app. At a minimum, the app should be able to read and display all FANET devices in range. You see other pilots without internet. Second, the app should be able to encode your current position and pass it to the device, which radiates it. Other pilots then see your position. The app can also be set up to transmit the pilot's name. If the app can estimate wind speed and direction from the thermal spiral, or detect the thermal strength, it can frame the matching FANET packet — and other pilots receive that information and see it on their displays. Wind data can also come from weather stations. All of this is base-level FANET functionality.

So the user gets a device that, when mounted correctly, needs no attention for the rest of its lifetime, and new features arrive transparently as flight apps evolve. From the user's perspective it feels as if a FANET transmitter were built into the smartphone.

## Hardware

The device looks like a small variometer with an external antenna. It has a 900 mAh battery, a solar panel, a USB Type-C charging port and a reset button. Dimensions: 98 × 34 × 16 mm. Weight: about 40 g. Off-solar runtime: about 20 hours.

![FlyBeeper FANET — PCB 3D render](/img/blog/flybeeper-fanet/01-pcb3d01.jpg)
*First prototype PCB, 3D render.*

## Status

- **2024-05-07** — First working prototype. Listens on FANET, repeats every received packet over Bluetooth. Writing a packet to the characteristic transmits it on the FANET network. RSSI and SNR of the most recent received packet are readable, along with battery level. OTA / DFU firmware updates are supported.
- **2024-06-20** — Third prototype. 868 MHz antenna tuned, BLE antenna relocated, body more compact. Battery capacity reduced. Firmware adds the text-protocol formats FNNGB, FBFAN and FNF. xcTrack and LK8000 developers have started implementing support.

## For developers

The device connects over Bluetooth without pairing or authentication. Advertising packets go out every 5 seconds for discovery. Right after reset or after a connection drop, advertising runs every 100 ms for 5 minutes to speed up rediscovery and reconnection. The advertising name is `FBFANET`. As a reminder, all FlyBeeper devices use the `FB` prefix.

### Reading FANET packets

Subscribe to characteristic `fec81438-cb89-4c37-93d0-badfced4376e` in the standard `LNS 0x1819` service. Each notification is a byte array containing one full FANET packet. Maximum packet length is 40 bytes; longer packets are dropped. The device performs no FANET-spec validation on what it receives. After a notification you can read `RSSI` and `SNR` of the most recent received packet from `1d242a85-6e0a-4d10-9d6a-a3e76dfa75c6` (RSSI, INT16) and `6d1a7208-10b5-4244-8f45-c1d0d4ebe5c9` (SNR, INT8).

### Transmitting FANET packets

To transmit a FANET packet, write the prepared byte array to the same characteristic `fec81438-cb89-4c37-93d0-badfced4376e` in `LNS 0x1819`. Packet length must not exceed 40 bytes; longer payloads are rejected.

A full protocol description is available [in the FANET spec](https://github.com/3s1d/fanet-stm32/blob/master/Src/fanet/radio/protocol.txt).
Example payload: `0x42061728536B794E65743A204B7265646172696361`.
Reminder: generating a unique ID in the packet header is the app developer's responsibility.

### Radio configuration

Because radio channel assignment varies by region, settings can be changed via the configuration service `904baf04-5814-11ee-8c99-0242ac120000`. Defaults are EU (868.2 MHz).

| Setting | Type | Characteristic UUID | Values |
| --- | --- | --- | --- |
| frequency | UINT32 | `8d8e8809-4697-41fc-8ee2-ca0b999354ec` | 868200000* — EU; 920800000 — US; 866200000 — IN; 923200000 — KR |
| bandwidth | INT8 | `f19422e2-982a-4954-9a75-b38927236a59` | 0 — 125 kHz; 1* — 250 kHz; 2 — 500 kHz |
| datarate | INT8 | `108b855f-11cd-4bc5-adee-eafce49bc77a` | 6 — SF_6; 7* — SF_7; 8 — SF_8; 9 — SF_9; 10 — SF_10; 11 — SF_11; 12 — SF_12 |
| coding_rate | INT8 | `17a95752-3c12-438f-9244-4f4612a1ab49` | 1* — 4/5; 2 — 4/6; 3 — 4/7; 4 — 4/8 |
| tx_power | INT8 | `8ef0c42e-adb6-4897-b9c9-6fe93143faf4` | -9 — min -9 dBm; 14* — +14 dBm; 22 — max +22 dBm |

(* = default)

![nRF Connect — radio configuration service exposed by FlyBeeper FANET (Russian UI)](/img/blog/flybeeper-fanet/02-image-2.png)
*Radio configuration service over BLE (Russian UI in nRF Connect).*

![nRF Connect — writing a FANET packet to the base characteristic (Russian UI)](/img/blog/flybeeper-fanet/03-image-3.png)
*Writing a prepared FANET payload to the base characteristic (Russian UI).*

Because the radio configuration is fully exposed, the device can transmit not only FANET packets but anything else the app developer wants — including ADS-L.

## TODO

The device will retail for around €100. But it is only useful once flight-app developers add support. Requests are out to xcTrack (in progress), SeeYou Navigator (alpha implementation done) and LK8000 (willing to try).

In addition to the base characteristic `fec81438-cb89-4c37-93d0-badfced4376e` (which transmits/receives packets with the currently configured settings), I plan to add a separate characteristic for each standard regional configuration. For example, one characteristic locked to FANET EU 868.2 MHz, another for FANET US 920.8 MHz, and so on. An app subscribing to one of these does not need to configure the radio explicitly. The catch: only one such characteristic can be subscribed to at a time, because the chip is single-channel.
