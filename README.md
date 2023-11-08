# Eruption Sensor

A GNOME 4x Shell extension for the [`Eruption`](https://github.com/X3n0m0rph59/eruption) realtime RGB LED driver for Linux.

## Why is this Extension even required?

GNOME >= 45 has very limited support to programmatically query the currently active window's attributes when running under Wayland.
This extension complements the `eruption-process-monitor` session-daemon to allow for switching of profiles and slots even when using GNOME with Wayland.

## Version Support Matrix

| Extension version | supported version of the Eruption daemon |
| ----------------- | ------------------------------------ |
| since `v1` | requires Eruption >= `0.5.0` |

Please find the installation instructions for this GNOME 4x shell extension here: [INSTALL.md](./INSTALL.md)
