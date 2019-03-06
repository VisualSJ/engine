'use strict';
const { format } = require('util');
const vStacks = require('v-stacks');
const ipc = require('../ipc');

const backup = {
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function init() {
    process.on('uncaughtException', function(err) {
        console.error(err);
    });

    console.warn = function(error, ...args) {
        if (!(error instanceof Error)) {
            error = format(error, ...args);
        }
        error = vStacks.encode(error, 1);
        backup.warn(vStacks.decode(error));
        ipc.send('console', 'warn', error);
    };

    console.error = function(error, ...args) {
        if (!(error instanceof Error)) {
            error = format(error, ...args);
        }
        error = vStacks.encode(error, 1);
        backup.error(vStacks.decode(error));
        ipc.send('console', 'error', error);
    };
}

exports.init = init;
