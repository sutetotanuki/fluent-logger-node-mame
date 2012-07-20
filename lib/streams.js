/**
 * streams以下のstream<type>jsを読み込んで登録するだけの人
 */

var streams = [],
    fs = require('fs'),
    path = require('path');

fs.readdirSync(path.join(__dirname, 'streams')).forEach(function(file) {
  var basename = path.basename(file, '.js'),
      className = basename[0].toUpperCase() + basename.slice(1),
      streamClass = require('./streams/' + basename)[className];

  streams[streamClass.prototype.type] = streamClass;
});

exports.get = function(type) {
  return streams[type];
};
