---
title: "FlyBeeper F1 Field Test Report (May 15, 2022)"
description: "Five hours, three F1 units, two GPS antennas, one RF interference incident over Cividale. Notes on GPS lock quality, vario behaviour, BLE companion app, and a Tagliamento-crossing flight across the Julian Alps."
pubDate: 2022-05-16
updatedDate: 2026-05-26
tags: ["flybeeper", "f1", "test-flight", "paragliding", "field-test", "gnss"]
draft: false
heroImage: "/img/flybeeper/f1/main.jpg"
ctaTarget: "/flybeeper"
toc: false
---

First proper flight test with the updated unit, and the first track recorded by the device itself. Five hours in the air, three F1 units on board. Two of the three had an extra active GPS antenna.

## GPS antenna comparison

The difference starts at power-on. With the extra antenna, GPS locks faster and more reliably, especially in awkward conditions. While walking, or with a poor view of the sky, the bare version sometimes fails to lock at all. The procedure is clear: wait for a fix before launching.

In the air the gap shrinks but does not disappear. From time to time one trace clearly diverges from the other two — most often it is altitude that lags behind.

![GPS traces compared — three F1 units on the same flight](/img/blog/flybeeper-f1-test-report/01-image-1.png)
*Three IGC traces overlaid: with and without the active GPS antenna.*

![Altitude divergence between F1 units in flight](/img/blog/flybeeper-f1-test-report/02-image-2.png)
*Altitude trace divergence between the three units.*

## RF interference incident

Flying past Cividale, with its cluster of large relay antennas, all three devices misread the current date/time in roughly the same spot. The resulting IGC log was being truncated at exactly that point on every analysis site I tried.

I do not know whether the antennas caused the corruption, but I patched the firmware to drop suspicious fixes. After the fix, I got three full IGC logs.

![IGC log truncation near Cividale relay antennas](/img/blog/flybeeper-f1-test-report/03-image-3.png)
*Track truncation on every analysis site near Cividale, before the firmware patch.*

## Variometer behaviour

The vario worked excellently — at least as good as my FlyBeeper mini buzzer, just louder. I flew at the minimum volume level; the second level is probably the sweet spot.

## Bluetooth and the app

The device was paired over BLE with my FlyBeeper Maps Android app. The connection held the whole flight. The app itself has a long list of issues, but at least it did not crash this time. On the Italian leg of the route I had no mobile internet, and switching between apps drops layers that need to be re-fetched. The most painful loss is the thermal-hotspots layer.

What I still miss is auto-zoom while coring a thermal, so for now I core almost entirely by ear. A wind-estimation overlay would also be useful. I will test SeeYou Navigator next, which has had both features for some time and recently added support for my device's FANET data.

Watching other paragliders inside my own app is genuinely fun. You see who is behind you and who is ahead, with their altitude and speed. Often you cannot pick them out by eye, but they are on the device — and it works with no internet at all.

![In-flight view with the F1 mounted on the riser](/img/blog/flybeeper-f1-test-report/04-gh010973.mp4_20220516_180742.787.jpg)
*In-flight view with the F1 mounted on the riser.*

## Route notes

This was my first flight beyond the Julian Alps, crossing the Tagliamento river and back. Thanks to a beautifully developed cumulus layer in the valley I also flew Gemona-to-Lijak in a straight line for the first time — a reminder of flatland flying. Unfortunately, I was not prepared for a flight that long, had to wrap up well before the end of the flyable day, and left Lijak for next time. A shame: the weather was outstanding.

![Tagliamento crossing route across the Julian Alps](/img/blog/flybeeper-f1-test-report/05-image-5.png)
*Route across the Tagliamento and back into the Julian Alps.*

## Follow-up

The next day I received the first test build of GPSDump with support for my device. Hopefully we can fix the remaining bugs and produce a valid IGC file.
