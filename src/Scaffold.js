const Path = require('path');
const FS = require('fs');
const Glob = require('glob');

/**
 * @typedef {Object} T_ScaffoldConfig
 * @property {string} path
 * @property {T_ScaffoldPackage} main
 */

/**
 * @typedef {Object} T_ScaffoldPackage
 * @property {string[]} [modules]
 * @property {Object<string, T_ScaffoldFile>} [files]
 */

/**
 * @typedef {Object} T_ScaffoldFile
 * @property {string} [namespace]
 * @property {string} [pattern]
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
      }, config.scaffold);
    }
  }

  /**
   * @param {T_ScaffoldConfig} config 
   * @param {T_ScaffoldPackage} scaffold
   */
  scaffoldInline(config, scaffold) {
    if (Array.isArray(scaffold.modules)) {
      for (const module of scaffold.modules) {
        const modPath = this.findPackage(require.resolve(module));
        const modConfig = require(modPath);
        
        if (modConfig.scaffold) {
          this.scaffoldInline(config, modConfig.scaffold);
        }
      }
    }
    if (scaffold.files) {
      for (const type in scaffold.files) {
        const fileDefinition = scaffold.files[type];
        console.log(type, scaffold.files);
      }
    }
  }

  replace(string, vars) {
    return new Function("return `" + string + "`;").call(vars);
  }

}