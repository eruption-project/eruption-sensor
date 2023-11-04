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
import Atspi from 'gi://Atspi'

import { Extension, gettext as _, ngettext, pgettext } from 'resource:///org/gnome/shell/extensions/extension.js';

let XDG_RUNTIME_DIR = GLib.getenv("XDG_RUNTIME_DIR");

let focusWindowTracker;

let file = Gio.File.new_for_path(`${XDG_RUNTIME_DIR}/eruption-sensor`);
let pipe = null; // file.append_to_async(0, 0, null, on_pipe_open);

let last_message = null;

function send(msg) {
    if (msg !== last_message) {
        if (!pipe) {
            console.warn("[eruption] sensor pipe is not available, trying to reopen...");

            pipe = null;
            pipe = file.append_to_async(0, 0, null, on_pipe_open);
        }

        try {
            console.log(`[eruption] event: ${msg}`);

            pipe.write(msg, null);
            last_message = msg;
        } catch {
            console.warn("[eruption] sensor pipe closed, reopening...");

            pipe = null;
            file.append_to_async(0, 0, null, on_pipe_open);
        }
    }
}

function on_pipe_open(file, res) {
    console.log("[eruption] sensor pipe opened");

    pipe = file.append_to_finish(res);
}

export default class SensorExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this.initTranslations(metadata.gettext_domain);

        Atspi.init();
    }

    _getFocusedWindowAndNotify() {
        let focusedWindow = focusWindowTracker?.focus_app?.get_windows()[0];

        if (focusedWindow) {
            let title = focusedWindow ? focusedWindow.get_title() : "";
            let cls = focusedWindow ? focusedWindow.get_wm_class() : "";

            send(`{ "window_title": "${title}", "window_class": "${cls}" }\n`);

        } else {
            console.warn(`[eruption] could not determine the currently focused window`);
        }
    }

    onFocusWindowChanged() {
        // The GNOME shell WindowTracker notified us about a change of the current top-level application
        // NOTE: This will miss all events relating to sub-windows of the currently active application
        //       So we won't get notified if e.g. a browser tab has been changed

        this._getFocusedWindowAndNotify();
    }

    onAtspiEvent(/* event */) {
        // AT-SPI notified us about a change of the focused window. This gives us the opportunity
        // to (re-)query the attributes of the focused window of the currently active application

        this._getFocusedWindowAndNotify();

        // console.log("[eruption] event: " + event.type + ", " + event.source.get_name() + ", " + event.source.get_description() + ", " + event.source.get_role_name());

        // We even could add super fine-grained notifications in the future, like per-widget focus events

        // const title = event?.source?.get_name() ? event.source.get_name() : "";
        // const description = event?.source?.get_description() ? event.source.get_description() : "";

        // send(`{ "window_title": "${title}", "window_class": "${description}" }\n`);
    }

    enable() {
        console.log(`[eruption] enabling ${this.metadata.name}`);

        this.settings = this.getSettings("org.gnome.shell.extensions.eruption-sensor");
        this.settings.connect("changed", this._update.bind(this));

        focusWindowTracker = Shell.WindowTracker.get_default();

        focusWindowTracker.connect("notify::focus-app", this.onFocusWindowChanged.bind(this));

        // this does not seem to work since GNOME >44 ...
        // focusWindowTracker.connect("notify::focus-window", this.onFocusWindowChanged.bind(this));

        // ... so we have to resort to the accessibility API to get fine-grained notifications

        this._atspiListener = Atspi.EventListener.new(this.onAtspiEvent.bind(this));
        this._atspiListener.register("object:state-changed:focused");
    }

    disable() {
        console.log(`[eruption] disabling ${this.metadata.name}`);

        // Disconnect signals and cleanup
        this._atspiListener.deregister("object:state-changed:focused");
        this._atspiListener = null;

        focusWindowTracker.disconnect("notify::focus-app");
        // focusWindowTracker.disconnect("notify::focus-window", this.onFocusWindowChanged);

        focusWindowTracker = null;

        this.settings = null;
    }

    reload() {
        console.log(`[eruption] reloading ${this.metadata.name}`);

        this.disable();
        this.enable();
    }

    _update() {
        console.log(`[eruption] updating settings ${this.metadata.name}`);
    }
}
