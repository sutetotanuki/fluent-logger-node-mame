var should      = require('chai').should(),
    Fluent      = require('../lib/streams/fluent').Fluent,
    MockFluentd = require('./support/mockfluentd').Server,
    fluent,
    fluentd,
    port;

function waitAndRead(waitTime, callback) {
  if ('function' === typeof waitTime) {
    callback = waitTime;
    waitTime = 100;
  }
  setTimeout(function() {
    fluentd.close(function(messages){
      callback(messages);
    });
  }, waitTime);
};

describe("FluentStream", function() {
  describe("ready to listening", function() {
    beforeEach(function(done) {
      fluentd = new MockFluentd();
      fluentd.listen(function(){
        fluent = new Fluent({port: fluentd.port});
        fluent.on('ready', function() {
          done();
        });
      });
    });

    it('should write successfully', function(done) {
      fluent.end("debug", {hanako: "kawaii"});

      waitAndRead(function(messages){
        messages[0].tag.should.equal("debug");
        messages[0].time.should.be.a('date');
        messages[0].obj.hanako.should.equal('kawaii');
        done();
      });
    });

    describe("multiple write", function() {
      it ('should write all emits', function(done) {
        fluent.write("debug", {hanako: "saiko"});
        fluent.end("debug", {hanako: "saiko2"});

        waitAndRead(function(messages) {
          messages.length.should.equal(2);
          done();
        });
      });
    });
  });

  describe('Store messages to buffer when disconnected', function() {
    before(function(done) {
      // get a random port
      fluentd = new MockFluentd();
      fluentd.listen(function(){
        port = fluentd.port;
        waitAndRead(function() {
          done();
        });
      });
    });
    
    it ('should send buffered messages when connected', function(done) {
      fluent = new Fluent({port: port, retryWait: 50});
      fluent.write("debug.1", {kokohore: "wanwan"});

      fluentd.listen(function() {
        waitAndRead(function(messages) {
          messages.length.should.equal(1);
          fluent.close();
          done();
        });
      });
    });
  });
});

