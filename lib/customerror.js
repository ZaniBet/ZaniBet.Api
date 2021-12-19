'use strict';

module.exports = function CustomError(status, code, title, detail) {
  Error.captureStackTrace(this, this.constructor);
  this.status = status; // http status
  this.code = code; // internal code
  this.title = title;
  this.message = detail;
  this.detail = detail;
};

require('util').inherits(module.exports, Error);
