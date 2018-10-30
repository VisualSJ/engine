'use strict';

const { EventEmitter } = require('events');
const { ipcRenderer } = require('electron');
const { serializeError, deserializeError } = require('./utils');

class WebviewIpc extends EventEmitter {

    constructor() {
        super();

        // 发送到 webview 的消息的队列
        this.sendQueue = [];

        this.isLock = false;
    }

    /**
     * 从当前页面发送到 host 内
     * @param {*} message
     * @param  {...any} args
     */
    send(message, ...args) {
        return new Promise((resolve, reject) => {
            const callback = function(error, data) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(data);
            };

            this.sendQueue.push({
                message,
                arguments: args,
                callback,
            });

            this.step();
        });
    }

    /**
     * 执行发送消息任务
     * 如果没有准备就绪，会等到准备就绪后执行
     */
    step() {
        const item = this.sendQueue[0];
        if (this.isLock || !item) {
            return;
        }
        this.isLock = true;
        ipcRenderer.sendToHost('webview-ipc:send', item);
    }

    /**
     * 准备就绪的时候调用这个接口
     */
    ready() {
        ipcRenderer.sendToHost('webview-ipc:ready');
    }
}

const ipc = module.exports = new WebviewIpc();

// host 发送过来的消息
ipcRenderer.on('webview-ipc:send', async (event, options) => {
    let handler = ipc._events[options.message];

    let data;
    try {
        data = handler(...options.arguments);
    } catch (error) {
        console.error(error);
        ipcRenderer.sendToHost('webview-ipc:send-reply', serializeError(error));
        return;
    }

    if (data instanceof Promise) {
        data
            .then((data) => {
                ipcRenderer.sendToHost('webview-ipc:send-reply', null, data);
            })
            .catch((error) => {
                ipcRenderer.sendToHost('webview-ipc:send-reply', serializeError(error));
            });
        return;
    }
    ipcRenderer.sendToHost('webview-ipc:send-reply', null, data);
});

// 当前页面发给 host 的返回消息
ipcRenderer.on('webview-ipc:send-reply', (event, error, args) => {
    const item = ipc.sendQueue.shift();
    item.callback(deserializeError(error), args);
    ipc.isLock = false;
    ipc.step();
});
