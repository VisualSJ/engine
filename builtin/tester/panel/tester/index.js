'use strict';

const { EventEmitter } = require('events');
const classify = require('./classify');
const logger = require('./logger');
const ipc = require('./ipc');
const dom = require('./dom');

class Tester extends EventEmitter {

    constructor() {
        super();
        this.Ipc = ipc;
        this.Dom = dom;
    }

    async run() {
        await classify.current.run();
    }
}

window.Tester = module.exports = new Tester();

logger.on('print', (item) => {
    module.exports.emit('print', item);
});
