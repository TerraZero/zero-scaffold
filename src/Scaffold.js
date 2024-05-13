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
 * @property {Object<string, T_ScaffoldTarget>} [paths]
 * @property {T_ScaffoldSource[]} [files]
 */

/**
 * @typedef {Object} T_ScaffoldTarget
 * @property {string} path
 * @property {string} [mode]
 */

/**
 * @typedef {Object} T_ScaffoldSource
 * @property {string} type
 * @property {string} pattern
 * @property {string} [namespace]
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
      config.scaffold.path = path;
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
          modConfig.scaffold.path = modPath;
          this.scaffoldInline(config, modConfig.scaffold);
        }
      }
    }
    if (scaffold.files) {
      const targetRoot = Path.dirname(config.path);
      for (const files of scaffold.files) {
        const root = Path.dirname(scaffold.path);
        const modname = Path.basename(root);
        const list = Glob.sync(files.pattern, {
          cwd: Path.join(root, files.namespace ?? ''),
        });
        for (const item of list) {
          const parse = Path.parse(item);
          parse.file = item;
          parse.module = this.toCamelCase(modname);
          parse.type = files.type;

          if (!config.main.paths[parse.type] || (!config.main.paths[parse.type].mode || config.main.paths[parse.type].mode === 'once') && FS.existsSync(Path.join(root, files.namespace ?? '', item))) continue;

          const target = Path.normalize(this.fillTemplate(config.main.paths[parse.type].path, parse));
          const from = Path.join(files.namespace ?? '', item);

          this.prepareDirectory(targetRoot, Path.dirname(target));
          process.stdout.write(`[Scaffold-${parse.module}-${parse.type}] ${from} => ${target}: `);
          FS.copyFileSync(Path.join(root, from), Path.join(targetRoot, target));
          console.log('OK');
        }
      }
    }
  }

  replace(string, vars) {
    return new Function("return `" + string + "`;").call(vars);
  }

  fillTemplate(template, params) {
    return new Function(...Object.keys(params), `return \`${template}\``)(...Object.values(params));
  }

  toCamelCase(input) {
    const separator = input.includes('-') ? '-' : '_';
    const words = input.split(separator);
    const camelCase = words.map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  prepareDirectory(root, dir) {
    const parts = Path.normalize(dir).split(Path.sep);
    while (parts.length) {
      const part = parts.shift();
      root = Path.join(root, part);
      if (!FS.existsSync(root)) FS.mkdirSync(root);
    }
  }

}