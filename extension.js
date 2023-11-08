/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Copyright (c) 2019-2023, The Eruption Development Team
 */

import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
// import Atspi from 'gi://Atspi'

import { Extension, gettext as _, ngettext, pgettext } from 'resource:///org/gnome/shell/extensions/extension.js';

let XDG_RUNTIME_DIR = GLib.getenv("XDG_RUNTIME_DIR");

export default class SensorExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this.last_message = null;
        this.pipe_opened = false;

        this.focusWindowTracker = null;

        this.file = Gio.File.new_for_path(`${XDG_RUNTIME_DIR}/eruption-sensor`);
        this.pipe = this.file.append_to_async(0, 0, null, this.on_pipe_open.bind(this));

        // Atspi.init();
    }

    send(msg) {
        if (this.pipe_opened && msg !== this.last_message) {
            if (!this.pipe) {
                console.error("[eruption-sensor] sensor pipe is not available, trying to open...");

                this.update_pipe_status(false);
            }

            try {
                console.log(`[eruption-sensor] event: ${msg}`);

                this.pipe.write(msg, null);
                this.last_message = msg;
            } catch {
                this.update_pipe_status(false);
            }
        }
    }

    on_pipe_open(file, res) {
        try {
            this.pipe = file.append_to_finish(res);
            this.update_pipe_status(true);
        } catch {
            this.update_pipe_status(false);
        }
    }

    update_pipe_status(opened) {
        this.pipe_opened = opened;

        if (opened) {
            console.log("[eruption-sensor] sensor pipe has been opened");

            this.start_tracking_windows();
        } else {
            console.log("[eruption-sensor] sensor pipe was closed");

            this.stop_tracking_windows();
            this.pipe = this.file.append_to_async(0, 0, null, this.on_pipe_open.bind(this));
        }
    }

    getFocusedWindowAndNotify() {
        try {
            let focusedWindows = this.focusWindowTracker?.focus_app?.get_windows();
            let focusedWindow = focusedWindows.find((element) => !(!element));

            let title = focusedWindow ? focusedWindow.get_title() : "";
            let cls = focusedWindow ? focusedWindow.get_wm_class() : "";

            this.send(`{ "window_title": "${title}", "window_class": "${cls}" }\n`);

            return true;
        } catch {
            console.log(`[eruption-sensor] could not determine the currently focused window`);

            return false;
        }
    }

    onFocusWindowChanged() {
        // The GNOME shell WindowTracker notified us about a change of the current top-level application
        // NOTE: This will miss all events relating to sub-windows of the currently active application
        //       So we won't get notified if e.g. a browser tab has been changed

        this.getFocusedWindowAndNotify();
    }

    onAtspiEvent(event) {
        // AT-SPI notified us about a change of the focused window. This gives us the opportunity
        // to (re-)query the attributes of the focused window of the currently active application

        let title;
        let description;

        try {
            title = event?.source?.get_name() ? event.source.get_name() : "";
            description = event?.source?.get_description() ? event.source.get_description() : "";

            if ((!title && !description) || (title === "" && description === ""))
                // we could not determine the focused windows attributes, fall back to the WindowTracker
                this.getFocusedWindowAndNotify();
            else
                this.send(`{ "window_title": "${title}", "window_class": "${description}" }\n`);
        } catch {
            this.getFocusedWindowAndNotify();
        }
    }

    start_tracking_windows() {
        this.focusWindowTracker = Shell.WindowTracker.get_default();

        this._onFocusWindowChangedHandler = this.focusWindowTracker.connect("notify::focus-app", this.onFocusWindowChanged.bind(this));

        // this._atspiListener = Atspi.EventListener.new(this.onAtspiEvent.bind(this));

        // this._atspiListener.register("focus");
        // this._atspiListener.register("object:state-changed:active");
        // this._atspiListener.register("object:state-changed:focused");
        // this._atspiListener.register("object:state-changed:showing");
    }

    stop_tracking_windows() {
        // this._atspiListener.deregister("focus");
        // this._atspiListener.deregister("object:state-changed:active");
        // this._atspiListener.deregister("object:state-changed:focused");
        // this._atspiListener.deregister("object:state-changed:showing");

        // this._atspiListener = null;

        this.focusWindowTracker?.disconnect(this._onFocusWindowChangedHandler, "notify::focus-app");

        this.focusWindowTracker = null;
    }

    enable() {
        console.log(`[eruption-sensor] enabling ${this.metadata.name}`);

        // this.settings = this.getSettings();
        // this.settings.connect("changed", this._update.bind(this));

        // we start tracking windows only when the pipe is opened by another process
    }

    disable() {
        console.log(`[eruption-sensor] disabling ${this.metadata.name}`);

        this.stop_tracking_windows();

        // this.settings = null;
    }

    reload() {
        console.log(`[eruption-sensor] reloading ${this.metadata.name}`);

        this.disable();
        this.enable();
    }

    _update() {
        console.log(`[eruption-sensor] updating settings ${this.metadata.name}`);
    }
}
