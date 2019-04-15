'use strict';

const { EventEmitter } = require('events');

class EventManager extends EventEmitter {

    emit(type, ...args) {
        try {
            super.emit(type, ...args);
        } catch(error) {
            console.error(error);
        }
    }
}

module.exports = EventManager;
