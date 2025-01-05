const ScaffoldEdit = require('zero-scaffold/src/ScaffoldEdit');

const index = process.argv.findIndex(v => v.endsWith('scaff-edit.js'));
const args = process.argv.filter((v, i) => i > index);

const scaffold = require('zero-scaffold');
const package = scaffold.findPackageRoot(__dirname);

const edit = new ScaffoldEdit(package, args);

edit.execute();