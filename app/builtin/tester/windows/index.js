'use strict';

const ipc = require('@base/electron-base-ipc');

const mouse = require('./mouse');
const board = require('./board');
const element = require('./element');

/**
 * 消息监听器
 * 负责 tester 消息的转发
 * @param {event} event
 * @param  {...any} operation array 操作步骤，需要拆分
 */
async function messageListener(event, panel, selector, operation, ...args) {

    const $elem = element.query(panel, selector);
    let result = null;

    switch(operation) {
        case 'attr':
            result = $elem.getAttribute(args[0]);
            break;

        case 'click':
            await mouse.click($elem);
            break;

        case 'input':
            await board.input($elem, args[0] || '');
            break;

        case 'enter':
            await board.enter($elem);
            break;

        case 'esc':
            await board.esc($elem);
            break;
    }

    event.reply(null, result);
}

exports.load = function() {
    ipc.on('package-tester:message', messageListener);
};

exports.unload = function() {
    ipc.removeListener('package-tester:message', messageListener);
};
