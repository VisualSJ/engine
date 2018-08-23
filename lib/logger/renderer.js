'use strict';

const ipc = require('@base/electron-base-ipc');
const logger = require('@base/electron-logger');

class Logger {

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

    /**
     * 监听事件
     */
    on(...args) {
        logger.on(...args);
    }
}

module.exports = new Logger();