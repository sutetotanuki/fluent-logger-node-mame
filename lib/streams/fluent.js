var EventEmitter = require('events').EventEmitter,
    msgpack      = require('msgpack-js'),
    net          = require('net'),
    util         = require('util');

var debug;
if (process.env.NODE_DEBUG && /fluent\-logger\-node\-mame/.test(process.env.NODE_DEBUG)) {
  debug = function(message) { console.error("[MAME DEBUG] %s", message); };
} else {
  debug = function() {};
}

/**
 * 
 * -- config --
 * {
 *   host:          "host name of fluentd",
 *   port:          "Number of port",
 *   maxBufferSize: "Number of Max Send buffer size",
 *   retryWait:     "Number of Wait time between retry and retry(msec)",
 *   maxRetry:      "Number of max retry to keep connection",
 *   tag:           "Tag preffix for fluentd"
 * }
 */
var Fluent = exports.Fluent = function(config) {
  EventEmitter.call(this);
  
  if (!config) {
    config = {};
  }

  this._bufferQueue  = [];
  this._bufferedSize = 0;
  this._socket       = undefined;
  this._connected    = false;
  this._keepConnect  = true;
  this._retryTimer   = undefined;
  this._retryCount   = 0;

  this.tag  = config.tag;
  this.host = config.host || "localhost";
  this.port = config.port || 24224;

  // default value is from fluent-logger-ruby
  this.maxBufferSize = config.maxBufferSize || 8*1024*1024;
  this.retryWait     = config.retryWait     || 500;
  this.maxRetry      = config.maxRetry      || 13;

  this.connect();
};
util.inherits(Fluent, EventEmitter);

Fluent.prototype.type = "fluent";

// Send packet to the Fluentd
Fluent.prototype.write = function(tag, data){
  if (this.tag) {
    tag = this.tag + "." + tag;
  }
  
  var time = (new Date()) / 1000,
      packedData = msgpack.encode([tag, time, data]);

  if (this._connected) {
    if (this._bufferQueue.length > 0) {
      this.flushBuffer();
    }

    this._socket.write(packedData);
  } else {
    this._bufferedSize += packedData.length;
    
    if (this._bufferSize_ > this.maxBufferSize) {
      // emitの引数に Error オブジェクト渡すと、
      // listenerいないと落とされるので、listenerがいるときだけemitする。
      if (self.listeners('error').length > 0) {
        this.emit('error', new Error("Exceed max buffer size"));
      }
      
      this._bufferedSize -= packedData.length;
    } else {
      this._bufferQueue.push(packedData);
    }
  }
};

Fluent.prototype.end = function(tag, data) {
  this.write(tag, data);
  this.flushBuffer();
  this.close();
};

Fluent.prototype.flushBuffer = function() {
  if (this._bufferQueue.length > 0) {
    var mergedBuffer = Buffer.concat(this._bufferQueue);

    // should split buffer by size(like a chunked encoding)?
    this._socket.write(mergedBuffer);
    
    this._bufferQueue.length = 0;
    this._bufferedSize = 0;
  }
};

// Close connection from Fluentd
Fluent.prototype.close = function() {
  this._keepConnect = false;
  
  if (this._socket) {
    this._socket.end();
  }
};

Fluent.prototype.reconnect = function() {
  var self = this;

  this._retryTimer = setInterval(function() {
    if (self._connected ||
        self._retryCount > self.maxRetry) {
      
      clearInterval(self._retryTimer);
      self._retryTimer = undefined;
      self._retryCount = 0;
    } else {
      debug("try to reconnect. count:" + self._retryCount);
      self.connect();
      self._retryCount += 1;
    }
    
  }, this.retryWait);
};

Fluent.prototype.connect = function() {
  if (!this._socket) {
    this._socket = new net.Socket();
    this.registerSocketListeners();
  }

  this._socket.connect(this.port, this.host);
};

Fluent.prototype.registerSocketListeners = function() {
  var self = this;

  /*
   * 下みたいにしたいけど、thisを渡す方法が思い浮かばない。。
   * this._socket.on('connect', this.onConnect)
   */

  /*
   * ------------------------------------
   * ON CONNECT
   * ------------------------------------
   */
  this._socket.on('connect', function(){
    self._connected = true;
    self.emit("ready", self._socket);
    
    if (self._bufferQueue.length > 0) {
      self.flushBuffer();
    }
  });

  /*
   * ------------------------------------
   * ON CLOSE
   * ------------------------------------
   */
  this._socket.on('close', function() {
    debug('disconnected to fluentd');
    self._connected = false;
    self.emit("close");

    if (self._keepConnect && !self._retryTimer) {
      self.reconnect();
    }
  });

  /*
   * ------------------------------------
   * ON ERROR
   * ------------------------------------
   */
  this._socket.on('error', function(e) {
    if (self.listeners('error').length > 0) {
      self.emit("error", e);
    }
  });
};
