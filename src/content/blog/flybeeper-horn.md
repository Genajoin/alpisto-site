---
title: "FlyBeeper Horn: a Variometer-Whistle for Paraglider Pilots"
description: "The smallest variometer in the FlyBeeper line, doubling as an emergency whistle and acoustic distress beacon. A demanding miniature project that combines tight PCB design, a composite CR2032 holder, and a 3D-printed enclosure that has to actually whistle."
pubDate: 2022-03-07
updatedDate: 2026-05-26
tags: ["flybeeper", "horn", "variometer", "paragliding", "hardware", "3d-printing"]
draft: false
ctaTarget: "/flybeeper"
toc: false
---

This is the smallest of my variometers — a fun-driven project I call the variometer-whistle. Besides its primary job of beeping in sync with the climb rate, it doubles as an acoustic distress beacon. The enclosure is shaped so it can be used as an ordinary whistle, but because there is a barometer onboard, the device can detect an unusually high static pressure and switch itself into SOS mode, periodically emitting a loud audio signal. Even if the pilot loses consciousness, the beacon should make them easier to find.

![Early FlyBeeper Horn prototype with the SMD whistle PCB and CR2032 holder](/img/blog/flybeeper-horn/01-img_20220316_212729.jpg)
*Early prototype of the variometer-whistle.*

For its size, this is a fairly demanding project on several fronts.

**PCB design.** The board uses the smallest available footprints for ICs, buttons and passive components. The only bulky part is the piezo buzzer itself, which has to be large enough to produce a useful sound pressure. To solder these boards I built a separate dedicated tool — a soldering hot plate. Solder paste and pick-and-place under a microscope are the workflow.

**Battery holder.** It is a composite assembly. On one side I use factory miniature SMD spring contacts. On the other side, the CR2032 cell is held in place and pressed against the contacts by the enclosure itself.

**Enclosure.** This is the hardest part of the project. The enclosure has to function as a whistle. To make it whistle, airflow has to be routed around the battery on one side of the PCB and around the buzzer on the other. At the same time the design has to allow battery replacement and remain printable on a 3D printer.

I will extend this post as the project progresses.

P.S. For customs classification this device falls under code 902620.
