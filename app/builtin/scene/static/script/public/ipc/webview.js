'use strict';

const { EventEmitter } = require('events');
const { ipcRenderer } = require('electron');
const { Storage } = require('./utils');
const { encode, decode } = require('v-stacks');

class WebviewIpc extends EventEmitter {
    constructor() {
        super();

        this._storage = new Storage();

        // 发送到 webview 的消息的队列
        this._sendQueue = [];

        this.isLock = false;
    }

    /**
     * 从当前页面发送到 host 内
     * @param {*} message
     * @param  {...any} args
     */
    send(message, ...args) {
        const tmp = encode(message, 2);
        return new Promise((resolve, reject) => {
            const callback = function(error, data) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(data);
            };

            const id = this._storage.add({
                message,
                arguments: args,
                callback,
                stacks: tmp.stacks,
            });
            this._sendQueue.push(id);

            this.step();
        });
    }

    /**
     * 强制发送，不管任何数据
     * @param {*} message
     * @param  {...any} args
     */
    forceSend(message, ...args) {
        const tmp = encode(message, 2);
        return new Promise((resolve, reject) => {
            const callback = function(error, data) {
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            };

            const id = this._storage.add({
                callback,
                stacks: tmp.stacks,
            });

            ipcRenderer.sendToHost('webview-ipc:force-send', id, message, args);
        });
    }

    /**
     * 清空之前队列内的数据
     */
    clear() {
        this.sendQueue.length = 0;
    }

    /**
     * 执行发送消息任务
     * 如果没有准备就绪，会等到准备就绪后执行
     */
    step() {
        if (this.isLock) {
            return;
        }
        const id = this._sendQueue.shift();
        if (id === undefined) {
            return;
        }

        this.isLock = true;
        const data = this._storage.get(id);
        ipcRenderer.sendToHost('webview-ipc:send', id, data.message, data.arguments);
    }
}

const ipc = (module.exports = new WebviewIpc());

// host 发送过来的消息
ipcRenderer.on('webview-ipc:send', async (event, id, message, params) => {
    const handler = ipc._events[message];

    try {
        const data = await handler(...params);
        ipcRenderer.sendToHost('webview-ipc:send-reply', id, null, data);
    } catch (error) {
        console.error(error);
        ipcRenderer.sendToHost('webview-ipc:send-reply', id, encode(error));
        return;
    }
});

// host 发送过来的消息
ipcRenderer.on('webview-ipc:force-send', async (event, id, message, params) => {
    const handler = ipc._events[message];

    try {
        const data = await handler(...params);
        ipcRenderer.sendToHost('webview-ipc:force-send-reply', id, null, data);
    } catch (error) {
        console.error(error);
        ipcRenderer.sendToHost('webview-ipc:force-send-reply', id, encode(error), null);
        return;
    }
});

// 当前页面发给 host 的返回消息
ipcRenderer.on('webview-ipc:send-reply', (event, id, error, args) => {
    const item = ipc._storage.get(id);
    if (item && item.callback) {
        if (error) {
            error.stacks = item.stacks;
            error = decode(error, 'error');
        }
        item.callback(error, args);
    }
    ipc.isLock = false;
    ipc.step();
});
