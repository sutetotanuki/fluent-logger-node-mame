var EventEmitter = require('events').EventEmitter,
    util         = require('util'),
    streams      = require('./streams');

var debug;
if (process.env.NODE_DEBUG && /fluent\-logger\-node\-mame/.test(process.env.NODE_DEBUG)) {
  debug = function(message) { console.error("[MAME DEBUG] %s", message); };
} else {
  debug = function() {};
}

/**
 *
 * @param {String|Object} tag
 * @param {Object} config
 *
 */
var Logger = exports.Logger = function(config) {
  EventEmitter.call(this);
  
  var i = 0,
      self = this;
  
  // set default configure if not present
  if (!config) {
    config = {
      streams: [{
        type: "fluent"
      }]
    };
  }
  
  // assigned default config
  this.streams            = {};
  this.streams.__proto__  = undefined;
  this.conditionHandler   = [];

  // ** register streams **
  if (config.streams) {
    for (; i < config.streams.length; i++) {
      var confTmp = config.streams[i];

      this.addStream(confTmp.type, this.createStream(confTmp.type, confTmp));
    }
  }

  // ** register conditionHandler **
  if (config.conditionHandler) {
    for (var key in config.conditionHandler) {
      this.registerHandler(key, config.conditionHandler[key]);
    }

    this.on('change', function(writableStreamTypes) {
      var conditionStr = writableStreamTypes.join(','),
          handler = self.conditionHandler[conditionStr];

      if ('function' === typeof handler) {
        handler.call(this);
      }
    });
  }
};
util.inherits(Logger, EventEmitter);

Logger.prototype.createStream = function(type, config) {
  var streamClass = streams.get(type);
  
  if (!streamClass) {
    throw new Error("Unregistered stream type: " + type);
  }
  
  return new (streams.get(type))(config);
};

Logger.prototype.getWritableStreamTypes = function() {
  var type,
      writableStreamTypes = [];

  for (type in this.streams) {
    if (this.streams[type].__ready) {
      writableStreamTypes.push(type);
    }
  }

  return writableStreamTypes.sort();
};

Logger.prototype.addStream = function(type, stream) {
  var self = this;
  
  if (this.streams[type]) {
    // can't add duplicate stream type
    return;
  }
  
  // set default flags
  stream.__enable = true;
  stream.__ready = false;

  stream.on('ready', function() {
    stream.__ready = true;
    self.emit('change', self.getWritableStreamTypes());
  });

  stream.on('close', function() {
    stream.__ready = false;
    self.emit('change', self.getWritableStreamTypes());
  });

  this.streams[type] = stream;
};

Logger.prototype.registerHandler = function(conditionCSV, enableTypes) {
  var conditionArray = conditionCSV.split(','),
      handler;
  // 後で join(",")して文字列で比べるんで並べとく。
  conditionArray.sort();

  // allow to regster a function
  if ('function' === typeof enableTypes) {
    handler = enableTypes;
  } else {
    handler = function() {
      var streamType;

      /*
       * enableTypesで指定されているStream typeのみenableにして他disable
       * ざっくりでいいのさ、ざっくりで
       */
      for (streamType in this.streams) {
        if (~enableTypes.indexOf(streamType)) {
          this.enableStream(streamType);
        } else {
          this.disableStream(streamType);
        }
      }
    };
  }

  // TODO: セパレータとして','(かんま)が妥当か考える
  this.conditionHandler[conditionArray.join(',')] = handler;
};

Logger.prototype.enableStream = function(type) {
  if (this.streams[type]) {
    this.streams[type].__enable = true;
  }
};

Logger.prototype.disableStream = function(type) {
  if (this.streams[type]) {
    this.streams[type].__enable = false;
  }
};

Logger.prototype.write = function(tag, data) {
  var type,
      stream;

  for (type in this.streams) {
    stream = this.streams[type];
    
    if (stream.__enable) {
      stream.write(tag, data);
    }
  }
};
