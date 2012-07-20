var EventEmitter = require('events').EventEmitter,
    dateformat = require('dateformat'),
    util = require('util');

var Console = exports.Console = function(config) {
  EventEmitter.call(this);

  if (!config) {
    config = {};
  }

  this.tag = config.tag;

  process.nextTick(function() {
    this.emit('ready');
  });
};
util.inherits(Console, EventEmitter);

Console.prototype.type = "console";

Console.prototype.write = function(tag, data) {
  var time = dateformat(new Date(), "yyyy-mm-dd'T'HH:MM:ss o"),
      serializedData = this.serialize(tag, time, data);

  console.log(serializedData);
};

Console.prototype.serialize = function(tag, time, data) {
  var jsonStr = JSON.stringify(data);

  return util.format("[%s] [%s] %s", tag, time, jsonStr);
};
