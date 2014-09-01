/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var NotesStorage = {
  load: function () {
    return localforage.getItem("notes1");
  },

  save: function (notes) {
    return localforage.setItem("notes1", notes);
  }
};
