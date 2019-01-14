'use strict';

const ipc = require('@base/electron-base-ipc');
const query = require('./element-query');
const { mouse, keyboard } = require('./event-simulate');

/**
 * 消息监听器
 * 负责 tester 消息的转发
 * @param {event} event
 * @param  {...any} actions array 操作步骤，需要拆分
 */
async function messageListener(event, ...actions) {
    const rt = {};

    // const {panel, selector, action};
    // 测试 获取节点及属性的 API
    // const panel = query.panel('assets');
    // const searchBtn = panel.element('.search-type');
    // const attrs = panel.attributes(searchBtn);
    // const position = panel.position(searchBtn);

    // console.log(panel);
    // console.log(searchBtn);
    // console.log(attrs);
    // console.log(position);

    // mouse.moveTo(position.cx, position.cy);

    // setTimeout(() => { // 可能是初始化有遮罩层
    //     mouse.click();
    // }, 2000);

    // 操作完成后，通知完成
    event.reply(null, rt);
}

exports.load = function() {
    ipc.on('package-tester:message', messageListener);
};

exports.unload = function() {
    ipc.removeListener('package-tester:message', messageListener);
};
