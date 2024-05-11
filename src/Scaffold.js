const Path = require('path');
const FS = require('fs');

module.exports = class Scaffold {

  /**
   * @param {string} dir 
   * @returns {string}
   */
  findPackage(dir) {
    let last = null;
    do {
      last = dir;
      dir = Path.join(dir, '..');
      if (FS.existsSync(Path.join(dir, 'package.json'))) {
        return Path.join(dir, 'package.json');
      } 
    } while (last !== dir);
    return null;
  }

  scaffold(config) {
    console.log(config);
  }

}