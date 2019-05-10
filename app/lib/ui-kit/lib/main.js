'use strict';

const Drag = require('./renderer/components/drag/browser');
const profile = require('./../../profile');
const uiProfile = profile.load('profile://default/ui-kit.json');
const menu = require('@base/electron-menu');
class UI {
    constructor() {
        uiProfile.set('num_input', {
            step: 1,
            preci: 6,
        });
    }

    get Drag () {
        return Drag;
    }
}

module.exports = new UI();