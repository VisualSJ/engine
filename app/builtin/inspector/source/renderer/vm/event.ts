'use strict';

import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

export function on(name: string, listener: (...args: any[]) => void) {
    return eventBus.on(name, listener);
}

export function off(name?: string, listener?: (...args: any[]) => void) {
    if (!name || !listener) {
        eventBus.removeAllListeners();
        return;
    }
    return eventBus.removeListener(name, listener);
}

export function emit(name: string, ...args: any[]) {
    eventBus.emit(name, ...args);
}