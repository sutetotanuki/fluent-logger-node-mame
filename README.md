# 使い方
## 普通に
```
var Logger = require ('fluent-logger-node-mame').Logger;
logger = new Logger();
logger.write("tag.dayo", {koko: "hore"});
```

## Loggerとか中途半端機能はいらない人
```
var Fluent = require ('fluent-logger-node-mame/streams/fluent').Fluent;
logger = new Fluent({port: 12345});
logger.write("tag.dayo", {koko: "hore"});
```
