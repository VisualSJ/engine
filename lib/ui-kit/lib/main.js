'use strict';

const Drag = require('./renderer/components/drag/browser');
const menu = require('@base/electron-menu');
class UI {

    get Drag () {
        return Drag;
    }
}

module.exports = new UI();