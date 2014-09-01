/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var NotesStorage = {
  load: function () {
    var values = Promise.all([
      localforage.getItem("notes3"),
      localforage.getItem("notes3_mac")
    ]);

    return values.then(function (values) {
      var notes = values[0];
      var notes_mac = values[1];
      if (!notes || !notes_mac) {
        return null;
      }

      return retrieveKey().then(function (key) {
        // Verify the MAC using the given key.
        return crypto.subtle.verify("HMAC", key, notes_mac, notes)
          .then(function (valid) {
            if (valid) {
              return decode(notes);
            }

            throw "Integrity/Authenticity check failed! Invalid password?";
          });
      });
    });
  },

  save: function (notes) {
    var buffer = encode(notes);

    return retrieveKey().then(function (key) {
      // Generate a MAC using the given key.
      return crypto.subtle.sign("HMAC", key, buffer)
        .then(function (mac) {
          return Promise.all([
            localforage.setItem("notes3", buffer),
            localforage.setItem("notes3_mac", mac)
          ]);
        });
    });
  }
};

function retrieveKey() {
  var params = Promise.all([
    // Get base key and salt.
    retrievePWKey(), getSalt()
  ]);

  return params.then(function (values) {
    var pwKey = values[0];
    var salt = values[1];

    // Do the PBKDF2 dance.
    return deriveKey(pwKey, salt);
  });
}

function deriveKey(pwKey, salt) {
  var params = {
    name: "PBKDF2",

    // TODO NSS does unfortunately not support PBKDF2 with anything
    // other than SHA-1 for now. Update this to SHA-256 once we support it.
    hash: "SHA-1",
    salt: salt,

    // The more iterations the slower, but also more secure.
    iterations: 5000
  };

  // The derived key will be used to compute HMACs.
  var alg = {name: "HMAC", hash: "SHA-256"};
  var usages = ["sign", "verify"];

  return crypto.subtle.deriveKey(
    params, pwKey, alg, false, usages);
}

function retrievePWKey() {
  // We will derive a new key from it.
  var usages = ["deriveKey"];

  // Show a native password input dialog.
  //return crypto.subtle.generateKey(
    //"PBKDF2", false, usages);

  // TODO Use .generateKey() as soon as that's supported for PBKDF2.
  var buffer = encode(prompt("Please enter your password"));
  return crypto.subtle.importKey("raw", buffer, "PBKDF2", false, usages);
}

function getSalt() {
  // Try to read a stored salt.
  return localforage.getItem("salt3")
    .then(function (salt) {
      if (salt) {
        return salt;
      }

      // We should generate at least 8 bytes
      // to allow for 2^64 possible variations.
      var salt = crypto.getRandomValues(new Uint8Array(8));
      return localforage.setItem("salt3", salt);
    });
}

function encode(str) {
  return new TextEncoder("utf-8").encode(str);
}

function decode(buf) {
  return new TextDecoder("utf-8").decode(buf);
}
