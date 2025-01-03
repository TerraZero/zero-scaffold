module.exports = class Registry {

  constructor(value) {
    this.value = value;
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
   * @param {CallableFunction} predicate 
   * @returns {Object[]}
   */
  all(type, predicate) {
    return this.value[type]?.filter(predicate) ?? [];
  }

}