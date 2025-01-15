const SystemCollector = require('zero-system/src/SystemCollector');
const scaffold = require('zero-scaffold');

require('../server/boot')();

const registry = scaffold.getRegistry(__dirname);

registry.setType('_collection', SystemCollector.pack());
scaffold.saveRegistry();
