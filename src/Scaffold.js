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

/**
 * @typedef {Object} T_ScaffoldAction
 * @property {string} type
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
    path = Path.join(Path.dirname(path), 'zero.json');
    if (!FS.existsSync(path)) return;

    const config = require(path);

    if (config.scaffold) {
      config.scaffold.path = path;
      this.scaffoldInline({
        path,
        main: config.scaffold,
      }, config.scaffold);

      if (config.scaffold.after) {
        this.doActions(config.scaffold.after, path);
      }
    }
  }

  /**
   * @param {T_ScaffoldConfig} config 
   * @param {T_ScaffoldPackage} scaffold
   */
  scaffoldInline(config, scaffold) {
    if (Array.isArray(scaffold.modules)) {
      for (const module of scaffold.modules) {
        const modPath = Path.dirname(this.findPackage(require.resolve(module)));
        const modConfigPath = Path.join(modPath, 'zero.json');
        if (!FS.existsSync(modConfigPath)) {
          console.error(`[Scaffold-ERROR] The module "${modPath}" has no zero.json. Please delete the module from include list "modules".`);
          continue;
        }

        const modConfig = require(modConfigPath);
        if (modConfig.scaffold) {
          modConfig.scaffold.path = modPath;
          this.scaffoldInline(config, modConfig.scaffold);
        }
      }
    }
    if (scaffold.files) {
      const targetRoot = Path.dirname(config.path);
      for (const files of scaffold.files) {
        const modname = Path.basename(scaffold.path);
        const list = Glob.sync(files.pattern, {
          cwd: Path.join(scaffold.path, files.namespace ?? ''),
        });
        for (const item of list) {
          const parse = Path.parse(item);
          parse.file = item;
          parse.module = this.toCamelCase(modname);
          parse.type = files.type;

          if (!config.main.paths[parse.type]) continue;

          const target = Path.normalize(this.template(config.main.paths[parse.type].path, parse));

          if ((!config.main.paths[parse.type].mode || config.main.paths[parse.type].mode === 'once') && FS.existsSync(Path.join(targetRoot, target))) continue;

          const from = Path.join(files.namespace ?? '', item);

          this.prepareDirectory(targetRoot, Path.dirname(target));
          process.stdout.write(`[Scaffold-${parse.module}-${parse.type}] ${from} => ${target}: `);
          FS.copyFileSync(Path.join(scaffold.path, from), Path.join(targetRoot, target));
          console.log('OK');
        }
      }
    }
  }

  template(template, params) {
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

  /**
   * @param {T_ScaffoldAction[]} actions 
   * @property {string} path
   */
  doActions(actions, path) {
    const root = Path.dirname(path);
    
    for (const action of actions) {
      switch (action.type) {
        case 'append':
          console.log(`[Scaffold-after-append] ${action.result}: `);
          const parts = [];

          if (action.file) {
            console.log(`  - base "${action.file}"`);
            parts.push(FS.readFileSync(Path.join(root, action.file)));
          }
          const files = Glob.sync(action.pattern, {
            cwd: root,
          });
          for (const file of files) {
            console.log(`  - append "${file}"`);
            parts.push(FS.readFileSync(Path.join(root, file)));
          }
          this.prepareDirectory(root, Path.dirname(action.result));
          FS.writeFileSync(Path.join(root, action.result), parts.join(action.separator ?? ''));
          console.log('  - finish');
          console.log();
          break;
      }
    }
  }

}
