const scaffold = require('zero-scaffold');

const package = scaffold.findPackageRoot(__dirname);

const plainArgs = process.argv.slice(2);
const args = Object.fromEntries(
  plainArgs.map(arg => {
    const [ key, value ] = arg.split('=');
    return [key.replace(/^--/, ''), value ?? true];
  })
);

if (args.after) {
  scaffold.scaffoldActions(package, ({ action }) => {
    if (action.tags) {
      return action.tags.includes(args.after);
    }
    return false;
  });
} else {
  scaffold.scaffold(package);
}