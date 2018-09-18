'use strict';

const { EventEmitter } = require('events');
const { serializeError, deserializeError } = require('./utils');

class HostIpc extends EventEmitter {

    constructor(webview) {
        super();
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
                const [options] = event.args;
                const handler = this._events[options.message];

                let data;
                try {
                    data = handler(...options.arguments);
                } catch (error) {
                    console.error(error);
                    this.$webview.send('webview-ipc:send-reply', serializeError(error));
                    return;
                }

                if (data instanceof Promise) {
                    data
                        .then((data) => {
                            this.$webview.send('webview-ipc:send-reply', null, data);
                        })
                        .catch((error) => {
                            this.$webview.send('webview-ipc:send-reply', serializeError(error));
                        });
                    return;
                }
                this.$webview.send('webview-ipc:send-reply', null, data);
            }

            // host 发送给 webview 的消息的反馈
            if (event.channel === 'webview-ipc:send-reply') {
                const [error, data] = event.args;
                const item = this.sendQueue.shift();
                item.callback(deserializeError(error), data);
                this.isLock = false;
                this.step();
            }

            // webview ipc 准备就绪的消息
            if (event.channel === 'webview-ipc:ready') {
                this.isReady = true;
                this.step();
            }

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
        if (!this.isReady || this.isLock) {
            return;
        }
        const item = this.sendQueue[0];
        if (!item) {
            return;
        }
        this.isLock = true;
        this.$webview.send('webview-ipc:send', item);
    }
}

module.exports = HostIpc;
