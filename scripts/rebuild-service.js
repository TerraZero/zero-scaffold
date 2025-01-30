const SystemCollector = require('zero-system/src/SystemCollector');
const scaffold = require('zero-scaffold');

console.log();
console.log('[RS] Load system boot');
console.log();

require('../server/boot')();

console.log();
console.log('[RS] Update registry');
console.log();

const registry = scaffold.getRegistry(__dirname);

registry.setType('_collection', SystemCollector.pack());
scaffold.saveRegistry();

console.log();
console.log('[RS] Execute scaffold actions for registry');
console.log();

const package = scaffold.findPackageRoot(__dirname);

scaffold.scaffoldActions(package, ({ action }) => {
  return action.type === 'registry';
});