'use strict';

const logger = require('./logger');

class Info {

    get prefix() {
        let tmp = this;
        let prefix = '';

        const tabs = [];

        while (tmp.parent) {
            let list;
            if (tmp instanceof Describe) {
                list = tmp.parent.subDescribes;
            } else {
                list = tmp.parent.subIts;
            }
            const index = list.indexOf(tmp);
            prefix = `${index + 1}.${prefix}`;
            tmp = tmp.parent;
            tabs.push('  ');
        }

        tabs.pop();

        return tabs.join('') + prefix;
    }

    /**
     * @param {*} message 描述信息
     * @param {*} handle 描述内的处理任务
     */
    constructor(message, handle) {
        this.parent = null;
        this.message = message;
        this.handle = handle;
    }
}

class It extends Info {

    /**
     * @param {*} message 描述信息
     * @param {*} handle 描述内的处理任务
     */
    constructor(message, handle) {
        super(message, handle);
        this._reject = null;
        this._timer = null;
    }

    async run() {
        exports.current = this;

        if (!this.handle) {
            return;
        }

        try {
            await new Promise((resolve, reject) => {
                this.timeout(5000);
                const result = this.handle.call(this);
                if (result instanceof Promise) {
                    this._reject = reject;
                    result.then(() => {
                        clearTimeout(this._timer);
                        resolve();
                    }).catch((error) => {
                        clearTimeout(this._timer);
                        reject(error);
                    });
                } else {
                    resolve();
                }
            });
        } catch (error) {
            logger.error(new Error(`${this.prefix} ${this.message || ''}`));

            console.log('');
            console.log('%c' + `${this.prefix} ${this.message || ''}`.trim(), 'color: red;');
            console.log('%c' + error.stack, 'color: red;');
        }

        exports.current = this.parent;
    }

    timeout(ms) {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this._reject && this._reject(new Error(`操作超时 ${ms}ms`));
        }, ms);
    }
}

class Describe extends Info {

    /**
     * @param {*} message 描述信息
     * @param {*} handle 描述内的处理任务
     */
    constructor(message, handle) {
        super(message, handle);

        this.parent = null;
        this.subDescribes = [];
        this.subIts = [];

        this.before = null;
        this.after = null;
    }

    addBefore(before) {
        this.before = before;
    }

    addAfter(after) {
        this.after = after;
    }

    /**
     * 添加一个子描述任务
     * @param {*} describe
     */
    addDescribe(describe) {
        describe.parent = this;
        this.subDescribes.push(describe);
    }

    /**
     * 添加一个 it
     * @param {*} it
     */
    addIt(it) {
        it.parent = this;
        this.subIts.push(it);
    }

    /**
     * 执行测试
     */
    async run() {
        exports.current = this;

        if (this.handle) {
            try {
                await this.handle();

                if (this.parent) {
                    logger.log(`${this.prefix} ${this.message || ''}`);
                }
            } catch (error) {
                if (this.parent) {
                    logger.error(new Error(`${this.prefix} ${this.message || ''}`));

                    console.error(`${this.prefix} ${this.message || ''}`);
                    console.error(error);
                }
            }
        }

        this.before && await this.before();

        // 优先测试自身的 it 任务
        for (let i = 0; i < this.subIts.length; i++) {
            const it = this.subIts[i];
            await it.run(i);
        }

        // 继续内部的 describe 任务
        for (let i = 0; i < this.subDescribes.length; i++) {
            const subDescribe = this.subDescribes[i];
            await subDescribe.run(i);
        }

        this.after && await this.after();

        if (this.parent) {
            exports.current = this.parent;
        } else {
            exports.current = new Describe();
        }
    }
}

window.describe = async function(message, handle) {
    exports.current.addDescribe(new Describe(message, handle));
};

window.it = function(message, handle) {
    exports.current.addIt(new It(message, handle));
};

window.before = function(handle) {
    exports.current.addBefore(handle);
};

window.after = function(handle) {
    exports.current.addAfter(handle);
};

exports.current = new Describe();
exports.Describe = Describe;
exports.It = It;
