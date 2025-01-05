const FS = require('fs');
const Path = require('path');

const Scaffold = require('../index');

module.exports = class ScaffoldEdit {

  /**
   * @param {string} root 
   * @param {Array} args 
   */
  constructor(root, args) {
    this.root = root;
    this.args = args;
  }

  execute() {
    this.command = this.args.shift();

    if (typeof this[this.command] === 'function') {
      this[this.command](...this.args);
    } else {
      console.error('Command not found')
    }
  }

  checkModule(module) {
    try {
      require.resolve(module)
      return true;
    } catch (e) {
      return false;
    }
  }

  add(...modules) {
    const json = Scaffold.getZeroJson(this.root);

    json.scaffold ??= {};
    json.scaffold.modules ??= [];
    
    for (const module of modules) {
      if (!this.checkModule(module)) {
        console.error('- ERROR: Module is not installed - ' + module);
        continue;
      }
      if (json.scaffold.modules.includes(module)) {
        console.warn('- WARNING: Module is already in scaffold - ' + module);
        continue;
      }
      json.scaffold.modules.push(module);
      console.log('- Add module "' + module + '" to scaffold');
    }
    process.stdout.write('- Save zero.json');
    FS.writeFileSync(Path.join(this.root, 'zero.json'), JSON.stringify(json, null, 2));
    console.log(' - SAVED');
  }

  remove(...modules) {
    const json = Scaffold.getZeroJson(this.root);

    json.scaffold ??= {};
    json.scaffold.modules ??= [];
    
    for (const module of modules) {
      const index = json.scaffold.modules.findIndex(v => v === module);
      if (index === -1) {
        console.warn('- WARNING: Module is not in scaffold - ' + module);
        continue;
      }

      json.scaffold.modules.splice(index, 1);
      console.log('- Remove module "' + module + '" from scaffold');
    }
    process.stdout.write('- Save zero.json');
    FS.writeFileSync(Path.join(this.root, 'zero.json'), JSON.stringify(json, null, 2));
    console.log(' - SAVED');
  }

}
