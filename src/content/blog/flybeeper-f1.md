---
title: "FlyBeeper F1: a Compact FANET-Capable Flight Instrument"
description: "A pocket-sized paragliding flight instrument with GNSS, barometer, 868 MHz LoRa FANET, BLE 5.0 and on-board logging. Built as both a FANET tracker and the main vario, with a long development log covering hardware, firmware, FAI-recognised IGC validation and a Web BLE configurator."
pubDate: 2022-04-21
updatedDate: 2026-05-26
tags: ["flybeeper", "f1", "fanet", "paragliding", "gnss", "ble", "hardware"]
draft: false
heroImage: "/img/flybeeper/f1/main.jpg"
ctaTarget: "/flybeeper"
toc: true
---

A flight instrument for paragliding. The core idea is two-fold: trans-radio tracking over FANET and forwarding air-traffic data to a smartphone-based moving-map flight computer. The hardware is rich enough that F1 can also serve as the primary flight instrument on its own.

## Hardware

- GNSS receiver (GPS + GLONASS)
- Barometric pressure sensor
- 868 MHz LoRa transceiver, peak output 22 dBm
- Bluetooth LE 5.0
- Piezo buzzer
- Small OLED screen
- Three buttons
- RGB LED
- 16 Mb NOR-flash storage
- 1000 mAh Li-Po battery

## Features

- Broadcasts its own position over FANET (868.2 MHz) using the built-in GPS and radio.
- Listens for FANET packets and selectively re-transmits them, extending network coverage.
- Shows current altitude, ground speed and vertical speed on the OLED, derived from GPS and the barometer.
- Sensitive audio variometer with three volume levels, the same engine as in the backup FlyBeeper mini.
- Records tracks to internal flash, up to 68 hours at 1 Hz.
- Connects to phones and tablets over Bluetooth LE 5.0.
- Streams configurable GPS, barometric and FANET data over BLE in NMEA-style sentences: GNRMC, GNGGA, POV, PRS, FBFAN, PFLAA.
- When paired with the Android app FlyBeeper Maps, it acts as a FANET base station, feeding live-tracking on flybeeper.com.

## Configuration

Through a web app or the Android app, the user can change the broadcast pilot name, select which data the device transmits, pick the vehicle type (paraglider, glider, walker, cyclist and so on), tune the transmitter power and set other parameters.

## Specifications

- Outer dimensions including the antenna: 106 × 33 × 19 mm
- Screen size: 23 × 13 mm
- Weight: 50 g
- Internal battery: 1000 mAh Li-Po
- Battery life: up to 16 hours at room temperature in testing, at least 11 hours at +10 °C
- Charging: micro-USB

## Development Log

**2020-08-01.** Project starts with the choice of the core platform. ASR6502 combines a LoRa transceiver and a Cortex-M0 with flash in a single die, which makes a modern, battery-powered instrument feasible.

**2020-08-27.** First working board.

**2021-07-06.** I start building the Android companion app, FlyBeeper Maps. It is an external moving-map screen showing FANET traffic from my device, plus other layers useful in flight. It is the first paragliding app I am aware of with 3D terrain.

**2021-09-23.** Built a Windows app for configuration and firmware updates.

**2021-11-18.** Active development of FlyBeeper Maps wrapped up.

**2022-01-06.** Root cause for the main outstanding bug — stability of the UART data streams — is finally found. The MCU's serial buffer was being drained too fast. There was also a transfer-rate problem with the cheap CC2541 BLE module. The workaround was a software delay after every 20 bytes. Newer nRF52 silicon has a much larger buffer but is several times more expensive.

**2022-04-05.** Flash storage library finished. I can now read, write and erase bytes reliably.

**2022-04-14.** New PCB revision ordered: flash chip, barometric sensor, piezo with amplifier, BLE module, two buttons.

![FlyBeeper F1 — PCB v1.1 layout](/img/blog/flybeeper-f1/02-pcbf1v11.png)
*PCB v1.1 layout.*

![FlyBeeper F1 — enclosure render](/img/blog/flybeeper-f1/01-image-6.png)
*Enclosure render of the F1 case.*

**2022-04-16.** First full-day track recorded — a drive to the sea. Altitude still jumps when passing through road tunnels.

**2022-04-18.** Started a single-page web app on top of the Web Serial API. About 600 lines of JavaScript let you fully configure and control the device from the browser over USB. Primary purpose: configuring the device and downloading tracks. It is also a scaffold for migrating that code into the maps app later. I tried the Web BLE API to drop the USB cable, but ran into either hardware or async-code issues.

**2022-04-20.** Reverted device settings to a JSON format. Flash usage went up to 91%, but it simplified support across the apps.

**2022-04-21.** New enclosure design with an additional active GPS antenna and extra side buttons. Fixed the battery-level indicator.

![Assembled F1 PCB on the bench](/img/blog/flybeeper-f1/03-img_20220421_200935-scaled.jpg)
*Assembled F1 prototype board.*

![F1 prototype fitted with the active GPS antenna](/img/blog/flybeeper-f1/04-img_20220422_114004.jpg)
*Prototype fitted with the active GPS antenna.*

**2022-04-22.** Rewrote power on/off. The flow is now DJI-style: short press, then long press, with RGB blinking as feedback. As a bonus, double-click toggles the flashlight.

**2022-04-23.** Added an SOS button on the front face. The power button moved to the left side and the menu button to the right; each button lights its own LED colour when pressed. Double-clicking SOS triggers a full audio-visual distress mode at maximum volume and brightness and broadcasts a FANET Distress Call.

**2022-04-24.** With the two extra side buttons in place, I added a proper menu: activity type, volume and NMEA output selection.

![F1 with side-mounted SOS and menu buttons](/img/blog/flybeeper-f1/05-img_20220424_012349.jpg)
*Front-face SOS button and side menu buttons.*

![FlyBeeper Device — web configurator over Web Serial (Russian UI)](/img/blog/flybeeper-f1/06-image.png)
*Web configurator over the Web Serial API (Russian UI).*

**2022-04-30.** Wrote a DLL for IGCshell — the FAI-recognised utility for downloading and validating tracks. This opens the door to negotiating with FAI for inclusion of the device in the official list of recognised hardware and for hosting my DLL on the validation site. I also started a conversation with the author of GPSDump about adding native support for my devices through this DLL. With GPSDump support in place, you could generate valid tracks even before the official FAI procedure is complete.

**2022-05-01.** Built a small console tool, `vali-xfb`, for online validation of my tracks.

**2022-05-03.** The SOS button got its final shape and will turn red soon. The reset button is now finger-proof — you need a paperclip and a hole. Fixed a few bugs. In menu mode GPS, FANET, BLE and the logger now keep running in the background. Entering the menu now requires a double-click. The reason: once the device sat in my pocket and accidentally stopped recording. Random menu entry is now extremely unlikely, and even if it happens, everything keeps running. The flashlight now fades in on activation, because a quick double-click is hard to distinguish from a short-then-long power press. The fade-in also doubles as brightness control: pressing the button mid-fade locks in the current brightness, so you don't get blinded by an unintentionally-bright beam.

![F1 device with the red SOS cap](/img/blog/flybeeper-f1/07-img_20220503_185657.jpg)
*Updated front face with the red SOS cap.*

**2022-05-09.** First batch of 30 PCBs has arrived. Everything fits cleanly. Logistics are now a long story. While I wait for the rest of the parts I am assembling as many as I can from what is in stock. Firmware work continues. A partial forced refactor: the code barely fits on the chip. Picked up the Web BLE API, so it is now possible to control the device not only over USB but over BLE from any smartphone — without installing an app — by visiting a web page. The same page can also serve as a live-map endpoint showing incoming FANET traffic.

![First batch of 30 F1 PCBs from the fab](/img/blog/flybeeper-f1/08-img_20220509_135118.jpg)
*First batch of 30 PCBs.*

**2022-05-11.** The FlyBeeper Device web tool can now be installed as a PWA. In Chrome on Android, "Add to Home Screen" puts an icon on the desktop. The app works offline. With BLE and GPS turned on, you press "BLE connect", pick your device from the list, and from there: **Info** shows current pressure, GPS state and battery; **Settings** lets you change all device parameters; **Tracks** lists saved tracks and lets you download any or wipe them all; **Log** is a terminal view of all device messages. One subtlety: BLE bandwidth is fairly low, so downloading tracks over USB is much faster. The "Set speed for UART" button raises the UART rate; on disconnect, the rate goes back to default. Don't forget to press disconnect.

![FlyBeeper Device PWA — Info tab](/img/blog/flybeeper-f1/09-image-7.png)
*FlyBeeper Device PWA installed from the browser.*

**2022-05-17.** First track with a valid IGC G-record accepted by every online tracker. All credit goes to GPSDump. Thanks to Stein for adding support for my device in version 5.42.

**2022-05-26.** New buttons on flybeeper.com/map/. You no longer need the Android app to connect a device and see nearby FANET traffic. Open the page, click one of the connection buttons, select your device. BLE works on smartphones, USB on desktops. After connecting, the device's FANET traffic flows to the website and is rendered on the map. Current barometric altitude appears at the top. Unlike the Android app, this needs an internet connection. If you grant the browser location permission, you can also centre yourself on the map. Your location is not sent to the server. The page also stores its viewport in cookies.

**2022-05-30.** Long wanted to add a thermals layer. The FANET data has been logged for a while, but the rendering only landed now. It will be fun to dig into the database and pull out every thermal of the season. For now the layer shows the last two hours only.

![Thermals layer on flybeeper.com/map rendered from FANET history](/img/blog/flybeeper-f1/10-captureth.jpg)
*Thermals layer rendered from FANET history.*

## Closing notes

In mid-2023 the F1 project moved into hibernation. The software stack and the technical groundwork carry forward into the next-generation devices. It was an excellent project and I am happy with the result overall — it forced me through a wide stack of technologies and made their strengths and weaknesses concrete. Future devices will lean heavily on this experience.
