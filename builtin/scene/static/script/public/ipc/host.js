'use strict';

const { EventEmitter } = require('events');
const { serializeError, deserializeError, Storage } = require('./utils');

class HostIpc extends EventEmitter {
    constructor(webview) {
        super();

        this._storage = new Storage();
        this._sendQueue = [];

        this.forceID = 0;
        this.forceMap = {};

        // webview element
        this.$webview = webview;

        // webview 内是否已经准备好接收数据
        this.isReady = false;

        // 是否正在等待返回
        this.isLock = false;

        // 发送到 webview 的消息的队列
        this.sendQueue = [];

        this.$webview.addEventListener('ipc-message', async (event) => {
            // webview 主动发送的 ipc 消息
            if (event.channel === 'webview-ipc:send') {
                const [id, message, params] = event.args;
                const handler = this._events[message];

                let result;
                try {
                    result = handler(...params);
                } catch (error) {
                    console.error(error);
                    this.$webview.send('webview-ipc:send-reply', id, serializeError(error));
                    return;
                }

                if (result instanceof Promise) {
                    result.then((result) => {
                        this.$webview.send('webview-ipc:send-reply', id, null, result);
                    }).catch((error) => {
                        this.$webview.send('webview-ipc:send-reply', id, serializeError(error));
                    });
                    return;
                }
                this.$webview.send('webview-ipc:send-reply', id, null, result);
            }

            // webview 主动发送的强制 ipc 消息
            if (event.channel === 'webview-ipc:force-send') {
                const [id, message, params] = event.args;
                const handler = this._events[message];

                try {
                    const result = await handler(...params);
                    this.$webview.send('webview-ipc:force-send-reply', id, null, result);
                } catch (error) {
                    console.error(error);
                    this.$webview.send('webview-ipc:force-send-reply', id, serializeError(error));
                    return;
                }
            }

            // host 发送给 webview 的消息的反馈
            if (event.channel === 'webview-ipc:send-reply') {
                const [id, error, data] = event.args;
                const item = this._storage.get(id);
                item && item.callback && item.callback(deserializeError(error), data);
                this._storage.remove(id);
                this.isLock = false;
                this.step();
            }

            // host 强制发送给 webview 的消息反馈
            if (event.channel === 'webview-ipc:force-send-reply') {
                const [id, error, data] = event.args;
                const item = this._storage.get(id);
                item && item.callback && item.callback(deserializeError(error), data);
                this._storage.remove(id);
            }

            // webview ipc 准备就绪的消息
            if (event.channel === 'webview-ipc:ready') {
                this.isReady = true;
                this.step();
            }
        });

        this.$webview.addEventListener('did-start-loading', () => {
            this.isReady = false;
            this.isLock = false;
            this.sendQueue = [];
        });
    }

    /**
     * 从主页面发送消息到 webview 内
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

            const id = this._storage.add({
                message,
                arguments: args,
                callback,
            });
            this._sendQueue.push(id);

            this.step();
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
        if (!this.isReady || this.isLock) {
            return;
        }
        const id = this._sendQueue.shift();
        if (id === undefined) {
            return;
        }
        this.isLock = true;
        const data = this._storage.get(id);
        this.$webview.send('webview-ipc:send', id, data.message, data.arguments);
    }

    /**
     * 强制发送，不管任何数据
     * @param {*} message
     * @param  {...any} args
     */
    forceSend(message, ...args) {
        return new Promise((resolve, reject) => {
            const callback = function(error, data) {
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            };

            const id = this._storage.add({
                callback,
            });

            this.$webview.send('webview-ipc:force-send', id, message, args);
        });
    }
}

module.exports = HostIpc;
