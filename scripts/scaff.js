const scaffold = require('zero-scaffold');

const package = scaffold.findPackageRoot(__dirname);

scaffold.scaffold(package);