'use strict';

class UuidArray {

    constructor() {
        this.uuids = [];
    }

    add(uuid) {
        const index = this.uuids.indexOf(uuid);
        if (index !== -1) {
            return false;
        }
        this.uuids.push(uuid);
        return true;
    }

    remove(uuid) {
        const index = this.uuids.indexOf(uuid);
        if (index === -1) {
            return false;
        }
        this.uuids.splice(index, 1);
        return true;
    }

    forEach(handler) {
        this.uuids.forEach(handler);
    }

    clear() {
        this.uuids = [];
    }
}

module.exports = UuidArray;
