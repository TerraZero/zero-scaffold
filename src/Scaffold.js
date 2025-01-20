const Path = require('path');
const FS = require('fs');
const Glob = require('glob');

const Registry = require('./Registry');

/**
 * @typedef {Object} T_ZeroConfig
 * @property {string[]} [includes]
 * @property {T_ScaffoldConfig} [scaffold]
 */

/**
 * @typedef {Object} T_ScaffoldConfig
 * @property {string} root
 * @property {T_ScaffoldPackage} main
 */

/**
 * @typedef {Object} T_ScaffoldPackage
 * @property {string} [root]
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
 * @property {string} file
 * @property {string} namepattern
 * @property {string} include
 */

module.exports = class Scaffold {

  /**
   * @param {string} string 
   * @returns {string}
   */
  static ucFirst(string) {
    return string.substring(0, 1).toUpperCase() + string.substring(1);
  }

  static mergeDeep(target, ...sources) {
    for (const source of sources) {
      for (const key in source) {
        const sourceValue = source[key];
        const targetValue = target[key];
  
        if (Array.isArray(sourceValue)) {
          target[key] = Array.isArray(targetValue) ? targetValue.concat(sourceValue) : [...sourceValue];
        } else if (typeof sourceValue === 'object' && sourceValue !== null) {
          target[key] = Scaffold.mergeDeep(targetValue || {}, sourceValue);
        } else {
          target[key] = sourceValue;
        }
      }
    }
    return target;
  }

  constructor() {
    this.registry = null;
  }

  /**
   * @param {string} dir 
   * @returns {Registry}
   */
  getRegistry(dir) {
    if (this.registry === null) {
      const root = this.findPackageRoot(dir);
      const path = Path.join(root, 'zero.registry.json');
      let registry = '{}';
      try {
        registry = FS.readFileSync(path);
      } catch (e) {}
      this.registry = new Registry(path, JSON.parse(registry));
    }
    return this.registry;
  }

  saveRegistry() {
    if (this.registry !== null) {
      FS.writeFileSync(this.registry.path, JSON.stringify(this.registry.value, null, 2));
    }
    return this;
  }

  /**
   * @param {string} dir 
   * @returns {string}
   */
  findPackageRoot(dir) {
    let last = null;
    do {
      last = dir;
      if (FS.existsSync(Path.join(dir, 'package.json')) || FS.existsSync(Path.join(dir, 'zero.json'))) {
        return dir;
      } 
      dir = Path.join(dir, '..');
    } while (last !== dir);
    return null;
  }

  /**
   * @param {string} module 
   * @returns {string}
   */
  findPackageRootModule(module) {
    return this.findPackageRoot(require.resolve(module));
  }

  /**
   * @param {string} dir 
   * @returns {?T_ZeroConfig}
   */
  getZeroJson(dir) {
    const path = Path.join(this.findPackageRoot(dir), 'zero.json');
    if (!FS.existsSync(path)) return null;
    return require(path);
  }

  /**
   * @param {string} module 
   * @returns {?T_ZeroConfig}
   */
  getZeroJsonModule(module) {
    return this.getZeroJson(require.resolve(module));
  }

  /**
   * @param {string} path 
   * @param {string} root 
   * @returns {T_ZeroConfig}
   */
  loadConfigExtend(path, root) {
    const config = JSON.parse(JSON.stringify(require(path)));
    if (config.extend) {
      console.log(`[Scaffold-extend] ${config.extend}.`);
      const files = Glob.sync(config.extend, {
        cwd: root,
      });

      for (const file of files) {
        process.stdout.write(`  - load ${file}`);
        const extend = require(Path.join(root, file));
        Scaffold.mergeDeep(config, extend);
        console.log(' - LOADED');
      }
    }
    return config;
  }

  /**
   * @param {string} root 
   */
  scaffold(root) {
    const path = Path.join(root, 'zero.json');
    if (!root || !FS.existsSync(path)) return;

    let config = this.loadConfigExtend(path, root);

    if (config.scaffold) {
      const registry = this.getRegistry(root);
      config.scaffold.root = root;

      // load only configs to ensure complete config
      this.scaffoldInline({
        root,
        main: config.scaffold,
      }, config.scaffold, registry, 'zero-config');
      // reload config
      config = this.loadConfigExtend(path, root);

      this.scaffoldInline({
        root,
        main: config.scaffold,
      }, config.scaffold, registry);

      this.saveRegistry();

      if (config.scaffold.after) {
        this.doActions(config.scaffold.after, root, registry);
      }

      this.checkRegistry(registry, root);

      this.saveRegistry();
    }
  }

  /**
   * @param {Registry} registry 
   * @param {string} root
   */
  checkRegistry(registry, root) {
    console.log('[Scaffold-registry] Check if files are existing...');
    for (const type in registry.value) {
      for (const file of registry.value[type]) {
        if (!file.file) {
          console.log('  - IGNORE: ' + file.name);
          continue;
        }
        if (!FS.existsSync(Path.join(root, file.file))) {
          console.log('  - PRUNE: ' + file.file);
          registry.remove(file.type, file.id);
        }
      }
    }
    console.log('[Scaffold-registry] Finish');
  }

  /**
   * @param {T_ScaffoldConfig} config 
   * @param {T_ScaffoldPackage} scaffold
   * @param {Registry} registry
   * @param {string} onlytype
   */
  scaffoldInline(config, scaffold, registry, onlytype = null) {
    if (Array.isArray(scaffold.modules)) {
      for (const module of scaffold.modules) {
        const modConfig = this.getZeroJsonModule(module);

        if (!modConfig) {
          console.error(`[Scaffold-ERROR] The module "${module}" has no zero.json. Please delete the module from include list "modules".`);
          continue;
        }

        if (modConfig.scaffold) {
          modConfig.scaffold.root = this.findPackageRootModule(module);
          this.scaffoldInline(config, modConfig.scaffold ?? {}, registry, onlytype);
        }
      }
    }

    for (const files of (scaffold.files ?? [])) {
      if (onlytype !== null && files.type !== onlytype) continue;

      const modname = Path.basename(scaffold.root);
      const list = Glob.sync(files.pattern, {
        cwd: Path.join(scaffold.root, files.namespace ?? ''),
      });
      for (const item of list) {
        const parse = Path.parse(item);
        parse.file = item;
        parse.module = this.toCamelCase(modname);
        parse.type = files.type;
        parse.module_name = modname;

        if (!config.main.paths[parse.type]) continue;

        const target = Path.normalize(this.template(config.main.paths[parse.type].path, parse));

        if ((!config.main.paths[parse.type].mode || config.main.paths[parse.type].mode === 'once') && FS.existsSync(Path.join(config.root, target))) continue;

        const from = Path.join(files.namespace ?? '', item);

        this.prepareDirectory(config.root, Path.dirname(target));
        process.stdout.write(`[Scaffold-${parse.module}-${parse.type}] ${from} => ${target}: `);
        
        FS.copyFileSync(Path.join(scaffold.root, from), Path.join(config.root, target));
        if (Array.isArray(config.main.paths[parse.type].prepend)) {
          const content = FS.readFileSync(Path.join(config.root, target));
          FS.writeFileSync(Path.join(config.root, target), this.template(config.main.paths[parse.type].prepend.join("\n"), parse) + content);
        }
        if (Array.isArray(config.main.paths[parse.type].append)) {
          FS.appendFileSync(Path.join(config.root, target), this.template(config.main.paths[parse.type].append.join("\n"), parse));
        }

        registry.add(parse.type, parse.name, {
          file: target,
          module: parse.module_name,
        });

        console.log('OK');
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
   * @param {string} root
   * @param {Registry} registry
   */
  doActions(actions, root, registry) {
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
        case 'registry':
          console.log(`[Scaffold-after-registry] ${action.include} -> ${action.file}: `);
          const lines = [];
          
          const items = [];
          const pattern = new RegExp(action.namepattern);
          console.log('  - PATTERN: ' + action.namepattern);
          for (const item of registry.all(action.include)) {
            process.stdout.write(`  - item ${item.id}`);
            const result = pattern.exec(item.id);
            if (result) {
              items.push({
                item,
                include: item.file.substring(0, item.file.length - 3).replace(/\\/g, '/'),
              });
              console.log(' -> ' + item.id);
            } else {
              console.log(' -> NO MATCH');
            }
          }

          lines.push('export default {');
          lines.push('');
          for (const item of items) {
            lines.push(`  '${item.item.name}': require('~/${item.include}'),`);
          }
          lines.push('');
          lines.push('}');

          this.prepareDirectory(root, Path.dirname(action.file));
          FS.writeFileSync(Path.join(root, action.file), lines.join('\n'));
          
          console.log('  - finish');
          console.log();
          break;
      }
    }
  }

}
