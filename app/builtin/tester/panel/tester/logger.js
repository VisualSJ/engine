'use strict';

const { EventEmitter } = require('events');

class Logger extends EventEmitter {

    log(message) {
        this.emit('print', {
            type: 'log',
            message: message,
        });
    }

    error(error) {
        if (typeof error === 'script') {
            this.emit('print', {
                type: 'error',
                message: error,
            });
        } else {
            this.emit('print', {
                type: 'error',
                message: error.message,
                stack: error.stack,
            });
        }
    }
}

module.exports = new Logger();
