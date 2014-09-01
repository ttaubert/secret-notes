/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var NotesStorage = {
  load: function () {
    var values = Promise.all([
      localforage.getItem("notes2"),
      localforage.getItem("notes2_hash")
    ]);

    return values.then(function (values) {
      var notes = values[0];
      var notes_hash = values[1];
      if (!notes || !notes_hash) {
        return null;
      }

      // Compute the SHA-256 digest for |notes|.
      return crypto.subtle.digest({name: "SHA-256"}, notes)
        .then(function (digest) {
          if (compare(notes_hash, digest)) {
            return decode(notes);
          }

          throw "Integrity check failed!";
        });
    });
  },

  save: function (notes) {
    var buffer = encode(notes);

    // Compute the SHA-256 digest for |notes|.
    return crypto.subtle.digest({name: "SHA-256"}, buffer)
      .then(function (digest) {
        return Promise.all([
          localforage.setItem("notes2", buffer),
          localforage.setItem("notes2_hash", digest)
        ]);
      });
  }
};

function encode(str) {
  return new TextEncoder("utf-8").encode(str);
}

function decode(buf) {
  return new TextDecoder("utf-8").decode(buf);
}

function compare(buf1, buf2) {
  var a = new Uint8Array(buf1);
  var b = new Uint8Array(buf2);

  if (a.byteLength != b.byteLength) {
    return false;
  }

  for (var i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
