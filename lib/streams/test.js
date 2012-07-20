var util = require('util'),
    EventEmitter = require('events').EventEmitter;

var Test = exports.Test = function(config) {
  var self = this;
  
  EventEmitter.call(this);

  process.nextTick(function() {
    self.emit('ready');
  });
};
util.inherits(Test, EventEmitter);
