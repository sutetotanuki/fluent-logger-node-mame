function invokeEvents(obj, events, next) {
  process.nextTick(function() {
    if (events.length > 0) {
      obj.emit(events.shift());
      invokeEvents(obj, events, next);
    } else {
      next();
    }
  });
};

exports.eventFlow = function(){
  var args = Array.prototype.slice.call(arguments),
      target = args.shift(),
      callback = args.pop();

  invokeEvents(target, args, callback);
};
