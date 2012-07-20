var chai      = require('chai'),
    should    = chai.should(),
    Logger    = require('../lib/logger').Logger,
    Test      = require('../lib/streams/test').Test,
    sinon     = require('sinon'),
    sinonChai = require('sinon-chai'),
    helper    = require('./support/helper');

chai.use(sinonChai);

describe('Logger', function() {
  describe('Write', function() {
    var stream, logger, spy;
    
    beforeEach(function() {
      spy = sinon.spy();
      logger = new Logger({});
      stream = new Test();
      stream.write = spy;
      logger.addStream("test", stream);
    });
    
    it('shoule writes message to stream', function() {
      logger.write("debug", {"koko": "hore"});
      spy.should.have.been.calledWith("debug", {"koko": "hore"});
    });

    it('should not writes message if disabled', function() {
      logger.disableStream("test");
      logger.write("debug", {"koko": "hore"});
      
      spy.should.not.have.been.called;
    });

    it('should writes message if enabled', function() {
      logger.disableStream("test");
      logger.enableStream("test");
      logger.write("debug", {"koko": "hore"});
      
      spy.should.have.been.called;
    });
  });

  describe('ConditionHandler', function() {
    var logger, testStream1, testStream2, spy1, spy2;

    beforeEach(function() {
      logger = new Logger({
        conditionHandler: {
          "test1,test2": ["test1", "test2"],
          "test1": ["test1"],
          "test2": ["test2"]
        }
      });
      testStream1 = new Test(),
      spy1 = sinon.spy(),
      testStream1.write = spy1;
      
      testStream2 = new Test(),
      spy2 = sinon.spy();
      testStream2.write = spy2;

      logger.addStream("test1", testStream1);
      logger.addStream("test2", testStream2);
    });

    it("should deliver all streams given log", function() {
      logger.write("debug", {hanako: "saiko"});
      spy1.should.have.been.called;
      spy2.should.have.been.called;
    });

    it("should be disabled when stream is closed", function(done) {
      helper.eventFlow(testStream1, 'close', function() {
        logger.write("debug", {hanako: "saiko"});
        spy1.should.not.have.been.called;
        done();
      });
    });

    it("should be enabled when stream is recovered", function(done) {
      helper.eventFlow(testStream1, 'close', 'ready', function() {
        logger.write("debug", {hanako: "saiko"});
        spy1.should.have.been.called;
        done();
      });
    });
  });
});
