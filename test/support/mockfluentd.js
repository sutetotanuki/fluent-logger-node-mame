var EventEmitter = require('events').EventEmitter,
    net          = require('net'),
    util         = require('util'),
    spawn        = require('child_process').spawn,
    fs           = require('fs'),
    path         = require('path');

var Server = exports.Server = function(config) {
  EventEmitter.call(this);

  var self = this;

  if (!config) {
    config = {};
  }

  // Configuration
  this.configPath = config.configPath || path.resolve(__dirname, "../../tmp/mockfluentd.conf");
  this.port       = config.port       || 0; // 0だとらんだむ
  this.fluentdCmd = config.fluentdCmd || "fluentd";
  
  // buffer for store outputs from fluentd. public property.
  /*
   * [format]
   * {
   *   raw: そのまま,
   *   time: Date object,
   *   tag: タグ,
   *   obj: parseしたJSON
   * }
   */
  this.messages = [];

  this._fluentd = undefined;

  process.on('exit', function() {
    if (self._fluentd && self._fluentd.exitCode === null) {
      self._fluentd.kill();
    }
  });
};
util.inherits(Server, EventEmitter);

Server.prototype.createConfig = function() {
  // xmlだから一行にしてやろう！と思ったけど、
  // エンティティの中って改行でパラメーター区切ってるぽいからあきらめた。
  // <source type=**>とか <source><type>aa</type></source>
  // とかでは冗長で嫌だったんかな。うん。
  var configStr = [
    "<source>",
    "type forward",
    "port " + this.port,
    "</source>",
    "<match debug.**>",
    "type stdout",
    "</match>"
  ].join("\n");

  fs.writeFileSync(this.configPath, configStr);
};

Server.prototype._spawnFluentd = function(callback) {
  var self = this,
      readData = "";
  
  function onData(data) {
    var p,chunk, matched;

    readData += data;

    while (~(p = readData.indexOf('\n'))) {
      chunk = readData.slice(0, p);

      if (~chunk.indexOf('{')) {
        // かなり苦しいけど、これしか思いつかない。
        // きっと、JSON形式が含まれているはず！
        matched = chunk.match(/^(.*) (.*): (.*)$/);
        var obj =  {
          raw: chunk,
          time: new Date(matched[1]),
          tag: matched[2],
          obj: JSON.parse(matched[3])
        };
        
        self.messages.push(obj);
      } else {
        if (chunk.match(/listening fluent socket on.*/)) {
          self.emit('listen');
          callback();
        }
      }
      
      readData = readData.slice(p + 1);
    }
  }

  function onError(data) {
    self.emit('error', new Error(data));
  };

  this._fluentd = spawn(this.fluentdCmd, ['-c', this.configPath]);
  
  // register event handler
  this._fluentd.stdout.on('data', onData);
  this._fluentd.stderr.on('data', onError);
};

Server.prototype.listen = function(callback) {
  var self = this,
      serverForGetRandomPort;

  if (this.port === 0) {
    serverForGetRandomPort = net.createServer();
    
    serverForGetRandomPort.listen(function() {
      self.port = serverForGetRandomPort.address().port;
      serverForGetRandomPort.on('close', function() {
        self.createConfig();
        self._spawnFluentd(callback);
      });
      serverForGetRandomPort.close();
    });
    
  } else {
    self.createConfig();
    self._spawnFluentd(callback);
  }
};

Server.prototype.close = function(callback) {
  var self = this;

  self._fluentd.on('exit', function() {
    callback(self.messages);
  });
  
  self.removeAllListeners('listen');
  self._fluentd.kill();
};
