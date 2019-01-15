'use strict';

const ipc = require('@base/electron-base-ipc');
const query = require('./element-query');
const { mouse, keyboard } = require('./event-simulate');

const sleep = (time) => new Promise((r) => setTimeout(r, time));

/**
 * 消息监听器
 * 负责 tester 消息的转发
 * @param {event} event
 * @param  {...any} operation array 操作步骤，需要拆分
 */
async function messageListener(event, panel, operation) {
    const rt = [];

    panel = query.panel(panel);

    for (const step of operation) {
        const data = await operating(panel, step);
        rt.push(data);
    }

    event.reply(null, rt);
}

async function operating(panel, step) {
    const element = panel.element(step.element);
    // TODO 需要补充用户操作事件，含 await

    const attrs = panel.attributes(element);
    const position = panel.position(element);

    return {attrs, position};
}

exports.load = function() {
    ipc.on('package-tester:message', messageListener);
};

exports.unload = function() {
    ipc.removeListener('package-tester:message', messageListener);
};
