const Path = require('path');
const FS = require('fs');

/**
 * @typedef {Object} T_ScaffoldConfig
 * @property {string} path
 * @property {Object} main
 * @property {Object} scaffold
 * @property {string[]} scaffold.modules
 */

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

  /**
   * @param {string} path 
   */
  scaffold(path) {
    const config = require(path);

    if (config.scaffold) {
      this.scaffoldInline({
        path,
        main: config.scaffold,
        scaffold: config.scaffold,
      });
    }
  }

  /**
   * @param {T_ScaffoldConfig} config 
   */
  scaffoldInline(config) {
    if (Array.isArray(config.scaffold.modules)) {
      for (const module of config.scaffold.modules) {
        const modPath = this.findPackage(require.resolve(module));
        const modConfig = require(modPath);
        console.log(modConfig);
      }
    }
  }

}