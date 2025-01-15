module.exports = class Registry {

  /**
   * @param {string} path 
   * @param {Object} value 
   */
  constructor(path, value) {
    this.path = path;
    this.value = value;
  }

  /**
   * @param {string} type 
   * @param {*} id 
   * @param {Object} values 
   * @returns {this}
   */
  add(type, id, values = {}) {
    values.id = id;
    values.type = type;
    this.value[type] ??= [];
    let index = -1;
    if ((index = this.getIndex(type, id)) === -1) {
      this.value[type].push(values);
    } else {
      this.value[type][index] = values;
    }
    return this;
  }

  /**
   * @param {string} type 
   * @param {Object<string, *>} items 
   * @returns {this}
   */
  setType(type, items) {
    for (const id in items) {
      this.add(type, id, items[id]);
    }
    return this;
  }

  /**
   * @param {string} type 
   * @param {*} id 
   * @param {string} prop 
   * @returns {Object}
   */
  get(type, id, prop = 'id') {
    return this.value[type]?.find(v => v[prop] === id) ?? null;
  }

  /**
   * @param {string} type 
   * @param {*} id 
   * @returns {this}
   */
  remove(type, id = null) {
    if (id === null) {
      delete this.value[type];
    } else {
      const index = this.getIndex(type, id);
      if (index !== -1) {
        this.value[type].splice(index, 1);
      }
    }
    return this;
  }

  /**
   * @param {string} type 
   * @param {*} id 
   * @param {string} prop 
   * @returns {int}
   */
  getIndex(type, id, prop = 'id') {
    return this.value[type]?.findIndex(v => v[prop] === id) ?? -1;
  }

  /**
   * @param {string} type 
   * @param {CallableFunction} predicate 
   * @returns {Object[]}
   */
  all(type, predicate = (() => true)) {
    return this.value[type]?.filter(predicate) ?? [];
  }

}