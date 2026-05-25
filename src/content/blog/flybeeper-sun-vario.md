---
title: "FlyBeeper Sun Vario: a Solar-Powered Bluetooth Variometer Under 8 Grams"
description: "A solar-powered BLE variometer that weighs under 8 g and never needs a battery change. Supercapacitor energy buffer, USB-C emergency charge in 60 seconds, 500,000 cycles, operating range -15 °C to +70 °C — designed as a primary vario for hike-and-fly paragliding."
pubDate: 2024-08-20
updatedDate: 2026-05-26
tags: ["flybeeper", "sun-vario", "variometer", "bluetooth-le", "solar", "supercapacitor", "paragliding", "hardware"]
draft: false
heroImage: "/img/flybeeper/sun-vario/main.jpg"
ctaTarget: "/flybeeper"
toc: false
---

The FlyBeeper mini BT is, to my knowledge, the smallest and lightest Bluetooth variometer available. Its standout features are the four remote-control buttons for the phone-side flight app and the swappable primary cell, which keeps working at temperatures where Li-ion batteries freeze. It is a popular paragliding instrument, prized for its sensitivity.

![FlyBeeper Sun Vario — first prototype with solar panel on the cockpit](/img/blog/flybeeper-sun-vario/01-photo_2024-08-05_17-24-08-e1724141358930.jpg)
*First prototype: solar panel, USB-C and supercapacitor in a sub-8 g body.*

The new Sun Vario project takes the same form factor in the direction of the day's popular trend but with all the latest components. The result is the prototype of the smallest and lightest Bluetooth variometer with an "eternal" power source. Highlights:

- Sensitivity comparable to "instantaneous" varios — but without their drawbacks.
- Three audible-volume levels. Loud enough for cockpit mounting.
- Bluetooth LE — transmits pressure, battery level and settings.
- Extensive configuration, including frequency, duty-cycle and period curves keyed to vario.
- Online configurator.
- Solar panel covers 100% of the device's consumption.
- Battery sized for 6 hours without sun.
- USB Type-C port for emergency charging — 0% to 100% in 60 seconds.
- 500,000 charge/discharge cycles, so battery wear is a non-issue. This enables a more rugged, non-serviceable enclosure.
- Operating temperature range: -15 °C to +70 °C — usable in extreme conditions.
- Weight under 8 g, ideal for hike-and-fly.
- 32 × 27 × 12 mm — fits on any cockpit or shoulder strap.

## Use cases

The device was designed as a primary, high-sensitivity audio variometer for everyday paragliding in mountain terrain. A single physical button handles volume. There is no way to accidentally drop into a setup mode. All of the (many) settings are changed through a clear graphical interface on your phone, wirelessly. The "eternal" battery and fixed mounting eliminate one checklist item from pre-flight preparation. The wide temperature range allows winter use.

The communication protocol is optimised for power and bandwidth and is supported by most popular flight computers. The second use case, then, is as an external pressure sensor for a flight app. While there is sun, the device is always discoverable. You do not need to power it on. Launch your app and it auto-discovers and connects, and the device becomes the barometric-altitude source. You can also use the app's audio vario through the phone's speaker or Bluetooth headphones. If the phone dies, you can wake the device's own buzzer with a single button press and keep flying.

## Hardware notes

Most projects like this combine a solar panel with a lithium battery. That combination shortens lifespan due to constant overcharging and a high cycle count. The operating-temperature range of a small Li-ion is narrow: it freezes early and overheats in the sun. The good news is that industry has finally started mass-producing affordable components that solve these problems.

Size and weight are preserved through the use of a low-voltage solar panel together with ultra-low-power MPPT and step-up conversion. Just ten years ago these technologies were unavailable in devices this small.

The device has its trade-offs. The main one is high self-discharge: it fully drains within a week. That is normal and does not affect battery life, but you have to account for it if you take long breaks from flying. Either leave the device in the sun for an hour before flight or plug it in for 60 seconds. Unlike most devices, this one can also be revived when you are fully suited up and ready to launch — 10 seconds on the cable is enough.

## FAQ

- **How do I power it on/off?** A long-press until the audible beep toggles between audio-vario mode and Bluetooth-only mode. For full shut-down (for example, on an aircraft) find the `Reset` hole on the back corner of the case. Use a thin object to press and release. Wait for a single LED flash; before the second flash press and release `Reset` again. The device powers down and is no longer reachable over Bluetooth. To bring it back, press `Reset` once.
- **Is there an accelerometer / IMU?** No. The device uses a modern high-sensitivity barometer and specialised algorithms to deliver fast climb-start and climb-end response without an accelerometer. Unlike cheap "instant" varios, this one is not sensitive to turbulence, chop, or the centripetal force of a thermal turn.
- **Is there an audio vario?** Yes. The device has a fairly large piezo. The tone is not as pleasant as a phone speaker but it is loud and energy-efficient. You can put the device in silent mode, connect it to a phone over Bluetooth, and use the phone's speaker instead.
- **How are settings changed?** All settings are changed in a convenient graphical web configurator by pairing the device over Bluetooth. The physical button only controls volume.
- **Is it weather-sealed?** No. The barometer — the most vulnerable component — must have unobstructed access to ambient air for sensitivity. The piezo also needs a path for sound to escape. Hermetically isolating these elements from the rest of the circuit is not worthwhile, because a damaged barometer would render the device useless anyway. That said, units have survived a trip through the washing machine.
- **Can I mount it on or in a helmet?** Yes, but in this case I recommend significantly increasing the "Vario averaging time" setting to reduce sensitivity to airflow gusts and pressure changes from head movement.
- **How is it mounted?** A hook-and-loop tape on the back of the device fastens it to a cockpit. The case has a hole for a safety tether. Mounting on the shoulder strap is acceptable, but you may need to increase the "Vario averaging time" to reduce sensitivity to wind gusts and to overall pressure changes from changes in airspeed.
- **Is there a "zeros" mode?** A special indication mode around zero vario values is trivially expressed as a curve and is the default. You can implement any behaviour you like via the 12-point curves for frequency, duration and duty cycle.
