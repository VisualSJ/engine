'use strict';

const Drag = require('./renderer/components/drag/browser');

class UI {

    get Drag () {
        return Drag;
    }
}

module.exports = new UI();