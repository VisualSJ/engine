'use strict';

/**
 * 数据存储器
 */
class Storage {

    constructor() {
        this._id = 0;
        this._map = {};
    }

    add(data) {
        const id = this._id++;
        this._map[id] = data;
        return id;
    }

    remove(id) {
        delete this._map[id];
    }

    get(id) {
        return this._map[id] || null;
    }
}
module.exports = {
    Storage,
};
