'use strict';

const { EventEmitter } = require('events');
const { Options, HostSender, decodeError, encodeError } = require('./utils');

class HostIpc extends EventEmitter {

    constructor(webview) {
        super();
        this.$webview = webview;

        this.$webview.addEventListener('ipc-message', async (event) => {
            
            if (event.channel === 'scene-webview:send') {
                let [options] = event.args;
                let handler = this._events[options.message];

                // 如果不是数组, 则只监听了一个函数
                if (!Array.isArray(handler)) {
                    let rError = null;
                    let rData = null;
                    try {
                        rData = await handler(...options.arguments);
                    } catch (error) {
                        rError = error
                        rData = null;
                    }
                    if (options.needCallback) {
                        this.$webview.send('scene-webview:send-reply', options.cid, encodeError(rError), JSON.stringify([rData]));
                    }
                    return;
                }

                // todo
            }

            if (event.channel === 'scene-webview:send-reply') {
                let [id, error, args2json] = event.args;

                let sender = HostSender.query(id);
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
                HostSender.remove(id);
            }

        });
    }

    /**
     * 从主页面发送消息到 webview 内
     * @param {*} message 
     * @param  {...any} args 
     */
    send(message, ...args) {
        let options = new Options(message, args || []);
        let sender = new HostSender(options, this.$webview);
        return sender;
    }
}

module.exports = HostIpc;