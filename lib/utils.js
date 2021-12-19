/*jslint node: true */
/*global exports */
'use strict';

const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
var anchorme = require("anchorme").default; // if installed via NPM

/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */
exports.uid = function (len) {
  var buf = [];
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.cleanVideoTitle = function(title) {
  title = entities.decode(title);
  title = anchorme(title);
  title = title.replace(/<a[^>]*>[\s\S]*?<\/a>/, "")
  .replace("-", "")
  .replace("  ", " ")
  .replace("(", "")
  .replace(")", "")
  .replace(" | Mas Videos Asi: ","");
  title = titleCase(title);
  return title;
};

function titleCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
