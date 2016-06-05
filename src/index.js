/* ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright 2015-6 Simon Wiles
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

      // for getting and setting Firefox's internal preferences
      prefsService = require("sdk/preferences/service"),

      // set-up event to monitor for changes to Firefox's internal cache preferences
      { PrefsTarget } = require("sdk/preferences/event-target"),
      cachePrefsTarget = new PrefsTarget({ branchName: "browser.cache." }),

      // for dealing with the add-on's own preferences
      simplePrefs = require("sdk/simple-prefs"),

      // for persistence across sessions
      ss = require("sdk/simple-storage"),

      // some constants
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
    updateButtonBadge();
  }

  function updateButtonBadge() {
    button.badge = (ss.storage.cachesDisabled) ? "off" : "";
  }

  function setCaches(state) {
    cachesToDisable.forEach(function(cachePref) { prefsService.set(cachePref, !state); });
  }

  var button = buttons.ActionButton({
    id: "cache-toggle-button",
    label: "Cache Disabler: " + labels[simplePrefs.prefs.cachesToDisable],
    icon: icons[themeIsDark()][simplePrefs.prefs.cachesToDisable],
    onClick: function() {
      ss.storage.cachesDisabled = !ss.storage.cachesDisabled;
      setCaches(ss.storage.cachesDisabled);
    }
  });

  exports.onUnload = function(reason) {
    // reset built-in prefs to defaults on unload.
    cachePrefsTarget.off();
    resetAllPrefs();
  };

  // monitor changes to cache states (which may or may not have been instigated by this add-on)
  // note: this will fire twice if both caches (disk and in-memory) are being managed
  cachePrefsTarget.on("", updateButtonBadge);

  // monitor changes to this add-on's own prefs
  simplePrefs.on("cachesToDisable", function() {
    cachesToDisable = cachePrefs[simplePrefs.prefs.cachesToDisable];
    button.label = "Cache Disabler: " + labels[simplePrefs.prefs.cachesToDisable];
    button.icon = icons[themeIsDark()][simplePrefs.prefs.cachesToDisable];
    ss.storage.cachesDisabled = false;
    resetAllPrefs();
  });

  if (!simplePrefs.prefs.rememberCacheState || ss.storage.cachesDisabled === undefined) {
    // read current state of Firefox cache preferences, and use that value
    ss.storage.cachesDisabled = cachesToDisable.every(cachePref => !prefsService.get(cachePref));
  } else {
    setCaches(ss.storage.cachesDisabled);
  }

  // configure the button in the correct state
  updateButtonBadge();

})();
