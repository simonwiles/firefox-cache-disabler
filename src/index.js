/* ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright 2015 Simon Wiles
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * ***** END LICENSE BLOCK ***** */

/* jshint unused:vars */
/* global require, exports */
"use strict";

(function(){

  var buttons = require("sdk/ui/button/action"),
      prefsService = require("sdk/preferences/service"),
      { PrefsTarget } = require("sdk/preferences/event-target"),
      cachePrefsTarget = new PrefsTarget({ branchName: "browser.cache." }),
      simplePrefs = require("sdk/simple-prefs"),
      icons = {
        false: ["./disk_and_memory-light.svg", "./disk-light.svg", "./memory-light.svg"],
        true: ["./disk_and_memory-dark.svg", "./disk-dark.svg", "./memory-dark.svg"],
      },
      labels = [
        "Disk and In-Memory",
        "Disk Only",
        "In-Memory Only"
      ],
      cachePrefs = [
        ["browser.cache.disk.enable", "browser.cache.memory.enable"],   // disk and in-memory
        ["browser.cache.disk.enable"],                                  // disk only
        ["browser.cache.memory.enable"],                                // in-memory only
      ],
      cachesToDisable = cachePrefs[simplePrefs.prefs.cachesToDisable];

  exports.onUnload = function(reason) {
    // reset built-in prefs to defaults on unload.
    cachePrefsTarget.off();
    resetAllPrefs();
  };

  function themeIsDark() {
    // This is unsatisfactory, but better than nothing.
    // I've tried a variety of techniques here, including checking for the "brighttext" attribute on #nav-bar,
    //  and comparing the foreground and background colors reported by getComputedStyle, but have been unable
    //  to find anything reliable.  At least this works for the default setup of Aurora/FDE.
    //
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=990477 -- the hacks mentioned here are not worth
    //  the hassle of implementing in this case.  Another possibility might be to leverage
    //  https://github.com/Rob--W/toolbarwidget-jplib but this is also overkill here, I think.
    //
    // Have also been unable to connect to an event that fires reliably when themes are changed,
    //  so have given up...
    return (prefsService.get("lightweightThemes.selectedThemeID") == "firefox-devedition@mozilla.org") && (prefsService.get("devtools.theme") == "dark");
  }

  function resetAllPrefs() {
    cachePrefs[0].forEach(function(cachePref) { prefsService.reset(cachePref); });
  }

  function updateButtonState() {
    button.cacheOn = cachesToDisable.every(cachePref => prefsService.get(cachePref));
    button.badge = (button.cacheOn) ? "" : "off";
    button.icon = icons[themeIsDark()][simplePrefs.prefs.cachesToDisable];
  }

  var button = buttons.ActionButton({
    id: "cache-toggle-button",
    label: "Cache Disabler: " + labels[simplePrefs.prefs.cachesToDisable],
    icon: icons[themeIsDark()][simplePrefs.prefs.cachesToDisable],
    cacheOn: true,
    onClick: function(state) {
      var enable = !button.cacheOn;
      cachesToDisable.forEach(function(cachePref) { prefsService.set(cachePref, enable); });
    }
  });

  // monitor changes to cache states (which may or may not have been instigated by this add-on)
  cachePrefsTarget.on("", updateButtonState);

  // monitor changes to this add-on's own prefs
  simplePrefs.on("cachesToDisable", function() {
    cachesToDisable = cachePrefs[simplePrefs.prefs.cachesToDisable];
    button.label = "Cache Disabler: " + labels[simplePrefs.prefs.cachesToDisable];
    resetAllPrefs();
  });

  // configure the button in the correct state
  updateButtonState();

})();
