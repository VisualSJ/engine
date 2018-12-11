'use strict';
let EventEmitter = require('events');

class TransformToolData extends EventEmitter {
    constructor() {
        super();
        this._toolName = 'position';   // position/rotation/scale
        this._coordinate = 'local'; // local/global
        this._pivot = 'pivot';  // pivot/center
        this._isLocked = false;

        // for 2d
        this._is2D = false;
        this._scale2D = 1.0;
    }

    get toolName() {
        return this._toolName;
    }
    set toolName(value) {
        this._toolName = value;
    }

    get coordinate() {
        return this._coordinate;
    }

    set coordinate(value) {
        this._coordinate = value;
    }

    get pivot() {
        return this._pivot;
    }
    set pivot(value) {
        this._pivot = value;
    }

    get isLocked() {
        return this._isLocked;
    }
    set isLocked(value) {
        this._isLocked = value;
    }

    get is2D() {
        return this._is2D;
    }
    set is2D(value) {
        this._is2D = value;
        this.emit('dimension-changed', this._is2D);
    }

    get scale2D() {
        return this._scale2D;
    }
    set scale2D(value) {
        this._scale2D = value;
        this.emit('scale2D-changed', this._scale2D);
    }
}

module.exports = new TransformToolData();
