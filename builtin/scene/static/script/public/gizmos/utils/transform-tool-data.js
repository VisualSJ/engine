'use strict';

class TransformToolData {
    constructor() {
        this._toolName = 'position';   // position/rotation/scale
        this._coordinate = 'local'; // local/global
        this._pivot = 'pivot';  // pivot/center
    }

    get toolName() {
        return this._toolName;
    }
    set toolName(value) {
        this._toolName = value;
    }

    get coordinate() {
        this._coordinate;
    }

    set coordinate(value) {
        this._coordinate = value;
    }

    get pivot() {
        this._pivot;
    }
    set pivot(value) {
        this._pivot = value;
    }
}

module.exports = new TransformToolData();
