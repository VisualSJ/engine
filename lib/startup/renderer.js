'use strict';

const { EventEmitter } = require('events');

const ipc = require('@base/electron-base-ipc');

class Startup extends EventEmitter {

    constructor() {
        super();

        this.process = 0;
        this.message = '';

        // 启动的时候查询一次当前的启动进度
        ipc.send('editor.startup:query-process').callback((error, num, message) => {
            this.process = num;
            this.message = message;
            this.emit('change', this.process, message);
            this.emit('message', message);
        });

        // 启动完毕后监听进度变化
        ipc.on('editor.startup:process', (event, num) => {
            this.process = num;
            this.emit('change', this.process);
        });

        // 启动完毕后监听文本变化
        ipc.on('editor.startup:message', (event, message) => {
            this.message = message;
            this.emit('message', message);
        });
    }
}

module.exports = new Startup();
