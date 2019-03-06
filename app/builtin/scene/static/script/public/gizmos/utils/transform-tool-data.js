'use strict';
let EventEmitter = require('events');

class TransformToolData extends EventEmitter {
    constructor() {
        super();
        this._toolName = 'position';   // position/rotation/scale/rect
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
        if (!this.isLocked) {
            this._toolName = value;
            this.emit('tool-name-changed', this._toolName);
        }
    }

    get coordinate() {
        return this._coordinate;
    }

    set coordinate(value) {
        if (!this.isLocked) {
            this._coordinate = value;
            this.emit('coordinate-changed', this._coordinate);
        }
    }

    get pivot() {
        return this._pivot;
    }
    set pivot(value) {
        if (!this.isLocked) {
            this._pivot = value;
            this.emit('pivot-changed', this._pivot);
        }
    }

    get isLocked() {
        return this._isLocked;
    }
    set isLocked(value) {
        this._isLocked = value;
        this.emit('lock-changed', this._isLocked);
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
        this.emit('scale-2d-changed', this._scale2D);
    }
}

module.exports = new TransformToolData();
