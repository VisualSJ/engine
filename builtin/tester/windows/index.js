'use strict';

const ipc = require('@base/electron-base-ipc');

/**
 * 消息监听器
 * 负责 tester 消息的转发
 * @param {event} event
 * @param  {...any} args
 */
async function messageListener(event, ...args) {
    // 操作完成后，通知完成
    event.reply(null, { x: 0, y: 0 });
}

exports.load = function() {
    ipc.on('package-tester:message', messageListener);
};

exports.unload = function() {
    ipc.removeListener('package-tester:message', messageListener);
};
