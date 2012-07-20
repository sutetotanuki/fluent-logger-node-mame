var EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    util = require('util'),
    dateformat = require('dateformat');

/**
 * 
 * -- config --
 * {
 *   filename: "Full file path writes to log",
 * }
 */
var File = exports.File = function(config) {
  EventEmitter.call(this);

  if (!config) {
    config = {};
  }
  
  this.filepath    = config.filename || "log/mamefluent.log";
  // きっとそのうち。。
  // this.maxFiles    = config.maxFiles || 0;
  // this.maxFileSize = config.maxFileSize || 0;

  this.tag = config.tag;

  this._stream = fs.createWriteStream(this.filepath, {flags: "a"});

  process.nextTick(function() {
    this.emit("ready", this._stream);
  });
};
util.inherits(File, EventEmitter);

File.prototype.type = "file";

File.prototype.write = function(tag, data) {
  var time = dateformat(new Date(), "yyyy-mm-dd'T'HH:MM:ss o"),
      serializedData = this.serialize(tag, time, data);
  
  this._stream.write(serializedData);
};

// This method will be overritten to change format.
File.prototype.serialize = function(tag, time, data) {
  var jsonStr = JSON.stringify(data);
  
  return util.format("[%s] [%s] %s\n", tag, time, jsonStr);
};

File.prototype.connect = function() {
  if (!this._stream) {
    this._stream = fs.createWriteStream(this.filepath, {flags: 'a'});
  }
};

File.prototype.close = function() {
  if (this._stream) {
    this._stream.end();
    this._stream.destroySoon();
    this._stream = undefined;
  }
};
