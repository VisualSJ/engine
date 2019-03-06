'use strict';

const { EventEmitter } = require('events');
const { Storage } = require('./utils');
const { encode, decode } = require('v-stacks');

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

                if (!handler) {
                    console.warn(`Could not find the message: ${message}`);
                    return;
                }

                let result;
                try {
                    result = handler(...params);
                } catch (error) {
                    console.error(error);
                    this.$webview.send('webview-ipc:send-reply', id, encode(error));
                    return;
                }

                if (result instanceof Promise) {
                    result.then((result) => {
                        this.$webview.send('webview-ipc:send-reply', id, null, result);
                    }).catch((error) => {
                        this.$webview.send('webview-ipc:send-reply', id, encode(error));
                    });
                    return;
                }
                this.$webview.send('webview-ipc:send-reply', id, null, result);
            }

            // webview 主动发送的强制 ipc 消息
            if (event.channel === 'webview-ipc:force-send') {
                const [id, message, params] = event.args;
                const handler = this._events[message];

                if (!handler) {
                    console.warn(`Could not find the message: ${message}`);
                    return;
                }

                try {
                    const result = await handler(...params);
                    this.$webview.send('webview-ipc:force-send-reply', id, null, result);
                } catch (error) {
                    console.error(error);
                    this.$webview.send('webview-ipc:force-send-reply', id, encode(error));
                    return;
                }
            }

            // host 发送给 webview 的消息的反馈
            if (event.channel === 'webview-ipc:send-reply') {
                let [id, error, data] = event.args;
                const item = this._storage.get(id);

                if (item && item.callback) {
                    if (error) {
                        error.stacks = item.stacks;
                        error.stacks.splice(0, 0, 'at <process:scene>');
                        error = decode(error, 'error');
                    }
                    item.callback(error, data);
                }

                // 如果发送中 isReady 变化，需要在 ready 之后重发
                if (this.isReady) {
                    this._storage.remove(id);
                    this.isLock = false;
                    this.step();
                } else {
                    this._sendQueue.splice(0, 0, id);
                }
            }

            // host 强制发送给 webview 的消息反馈
            if (event.channel === 'webview-ipc:force-send-reply') {
                let [id, error, data] = event.args;
                const item = this._storage.get(id);

                if (item && item.callback) {
                    if (error) {
                        error.stacks = item.stacks;
                        error.stacks.splice(0, 0, 'at <process:scene>');
                        error = decode(error, 'error');
                    }
                    item.callback(error, data);
                }

                this._storage.remove(id);
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
        const tmp = encode('message', 2);
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
        const tmp = encode('message', 2);
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

            this.$webview.send('webview-ipc:force-send', id, message, args);
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

        // 取出第一个消息 id
        const id = this._sendQueue.shift();
        if (id === undefined) {
            return;
        }

        // 开始发送，加锁
        this.isLock = true;
        const data = this._storage.get(id);
        this.$webview.send('webview-ipc:send', id, data.message, data.arguments);
    }
}

module.exports = HostIpc;
