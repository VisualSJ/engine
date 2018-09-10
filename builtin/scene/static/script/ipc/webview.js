'use strict';

const { EventEmitter } = require('events');
const { ipcRenderer } = require('electron');
const { Options, WebviewSender, decodeError, encodeError } = require('./utils');

class WebviewIpc extends EventEmitter {

    constructor() {
        super();

    }

    send(message, ...args) {
        let options = new Options(message, args);
        return new WebviewSender(options);
    }
}

let ipc = module.exports = new WebviewIpc();

// host 发送过来的消息
ipcRenderer.on('scene-webview:send', async (event, options) => {
    let handler = ipc._events[options.message];

    // 如果不是数组, 则只监听了一个函数
    if (!Array.isArray(handler)) {
        let rError = null;
        let rData = null;
        try {
            rData = await handler(...options.arguments);
        } catch (error) {
            rError = error;
            rData = null;
        }
        if (options.needCallback) {
            ipcRenderer.sendToHost('scene-webview:send-reply', options.cid, encodeError(rError), JSON.stringify([rData]));
        }
        return;
    }

    // todo
});

ipcRenderer.on('scene-webview:send-reply', (event, id, error, args2json) => {
    let sender = WebviewSender.query(id);
    // 如果数据不存在，则有两种可能
    //   1. 多次响应，数据已经被删除
    //   2. 数据不需要返回
    if (!sender) {
        console.warn(`Sender does not exist`);
        return;
    }

    // 如果含有回调函数，则触发回调
    if (sender._callback) {
        sender._callback(decodeError(error), ...JSON.parse(args2json));
    }

    // 移除索引
    WebviewSender.remove(id);
});