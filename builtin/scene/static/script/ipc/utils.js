'use strict';

const { ipcRenderer } = require('electron');

/**
 * 编码 error 对象
 * 因为 ipc 消息在发送的过程中会丢失类型数据
 * @param {*} error 
 */
let encodeError = function (error) {
    if (!error) {
        return null;
    }
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
    }
};

/**
 * 解码 error 对象
 * @param {*} obj 
 */
let decodeError = function (obj) {
    if (!obj) {
        return null;
    }
    let error = new Error();
    error.name = obj.name;
    error.message = obj.message;
    error.stack = obj.stack;
    return error;
};

let _senderID = 0;
let _id2sender = Object.create(null);

/**
 * 消息参数
 */
class Options {
    constructor(message, args) {
        this.cid = _senderID++;                // 唯一 id
        this.message = message;           // 消息名字
        this.arguments = args || [];         // 消息参数
        this.needCallback = false;   // 是否需要返回
    }
}

let HostSenderLock = false;
let HostSenderQueue = [];

/**
 * 主页面发送给 webview 的临时 sender 对象
 */
class HostSender {

    static step() {
        if (HostSenderLock || HostSenderQueue.length === 0) {
            return;
        }
        HostSenderLock = true;
        let func = HostSenderQueue.shift();
        func && func();
    }

    static query (id) {
        return _id2sender[id];
    }

    static remove (id) {
        delete _id2sender[id];
    }

    constructor(options, webview) {
        this.options = options;
        HostSenderQueue.push(() => {
            webview.send('scene-webview:send', this.options);
        });
        process.nextTick(HostSender.step);
    }

    /**
     * 等待返回数据
     */
    promise () {
        return new Promise((resolve, reject) => {

            this.options.needCallback = true;

            // 如果有 callback 才需要记录
            _id2sender[this.options.cid] = this;

            this._callback = function (error, data) {
                HostSenderLock = false;
                process.nextTick(HostSender.step);
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            };
        });
    }
}

/**
 * webview 发送给主页面的临时 sender 对象
 */
class WebviewSender {

    static query (id) {
        return _id2sender[id];
    }

    static remove (id) {
        delete _id2sender[id];
    }

    constructor(options) {
        this.options = options;

        process.nextTick(() => {
            ipcRenderer.sendToHost('scene-webview:send', options);
        });
    }

    /**
     * 等待返回数据
     */
    promise () {
        return new Promise((resolve, reject) => {

            this.options.needCallback = true;

            // 如果有 callback 才需要记录
            _id2sender[this.options.cid] = this;

            this._callback = function (error, data) {
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            };
        });
    }
}

module.exports = {
    Options,
    HostSender,
    WebviewSender,

    encodeError,
    decodeError,
};