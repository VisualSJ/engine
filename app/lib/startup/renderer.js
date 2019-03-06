'use strict';

const { EventEmitter } = require('events');

class Startup extends EventEmitter {

    constructor() {
        super();
    }
}

module.exports = new Startup();
