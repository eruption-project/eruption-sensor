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

import GObject from 'gi://GObject';

import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';

import { ExtensionPreferences, gettext as _, ngettext, pgettext } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SensorExtensionPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        this.initTranslations(metadata.gettext_domain);
    }

    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();

        group.add(this.buildPrefsWidget());
        page.add(group);

        window.add(page);
    }

    buildPrefsWidget() {
        const builder = new Gtk.Builder();

        builder.set_scope(new MyBuilderScope(this));
        builder.add_from_file(this.metadata.dir.get_path() + "/prefs.ui");

        const provider = new Gtk.CssProvider();

        provider.load_from_path(this.metadata.dir.get_path() + "/stylesheet.css");
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
        );

        const settings = this.getSettings("org.gnome.shell.extensions.eruption-sensor");

        return builder.get_object("main_prefs");
    }
}

const MyBuilderScope = GObject.registerClass(
    {
        Implements: [Gtk.BuilderScope],
    },
    class MyBuilderScope extends GObject.Object {
        constructor(extension) {
            super();

            this.settings = extension.getSettings("org.gnome.shell.extensions.eruption-sensor");
        }

        vfunc_create_closure(_builder, handlerName, flags, connectObject) {
            if (flags & Gtk.BuilderClosureFlags.SWAPPED) {
                throw new Error("Unsupported template signal flag 'swapped'");
            }

            if (typeof this[handlerName] === "undefined") {
                throw new Error(`${handlerName} is undefined`);
            }

            return this[handlerName].bind(connectObject || this);
        }
    },
);