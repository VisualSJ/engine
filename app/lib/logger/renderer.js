'use strict';

const { EventEmitter } = require('events');

const ipc = require('@base/electron-base-ipc');
const logger = require('@base/electron-logger');

class Logger extends EventEmitter {

    /**
     * 清除所有的 log
     */
    clear() {
        ipc.send('editor-lib-logger:call', 'clear');
    }

    /**
     * 启动记录
     */
    starup() {
        ipc.send('editor-lib-logger:call', 'starup');
    }

    /**
     * 查询指定的 log 数据
     */
    query() {
        return logger.query();
    }
}

module.exports = new Logger();

// 触发指定的事件
logger.on('record', (item) => {
    module.exports.emit('record', item);
});
