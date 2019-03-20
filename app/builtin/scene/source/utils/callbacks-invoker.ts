'use strict';

const js = cc.js;
const fastRemoveAt = js.array.fastRemoveAt;
class CallbackList {
    public callbacks: any = [];
    public targets: any = []; // same length with callbacks, nullable
    public isInvoking: boolean = false;
    public containCanceled: boolean = false;

    constructor() {
        this.callbacks = [];
        this.targets = []; // same length with callbacks, nullable
        this.isInvoking = false;
        this.containCanceled = false;
    }

    public removeBy(array: any, value: any) {
        const callbacks = this.callbacks;
        const targets = this.targets;
        for (let i = 0; i < array.length; ++i) {
            if (array[i] === value) {
                fastRemoveAt(callbacks, i);
                fastRemoveAt(targets, i);
                --i;
            }
        }
    }

    public cancel(index: any) {
        this.callbacks[index] = this.targets[index] = null;
        this.containCanceled = true;
    }

    public cancelAll() {
        const callbacks = this.callbacks;
        const targets = this.targets;
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i] = targets[i] = null;
        }
        this.containCanceled = true;
    }

    // filter all removed callbacks and compact array
    public purgeCanceled() {
        this.removeBy(this.callbacks, null);
        this.containCanceled = false;
    }
}
const MAX_SIZE = 16;
const callbackListPool = new js.Pool((list: any) => {
    list.callbacks.length = 0;
    list.targets.length = 0;
    list.isInvoking = false;
    list.containCanceled = false;
}, MAX_SIZE);
callbackListPool.get = function() {
    return this._get() || new CallbackList();
};
/**
 * The CallbacksHandler is an abstract class that can register and unregister callbacks by key.
 * Subclasses should implement their own methods about how to invoke the callbacks.
 * @class _CallbacksHandler
 *
 * @private
 */
class CallbacksHandler {
    public _callbackTable = js.createMap(true);

    /**
     * @method add
     * @param {String} key
     * @param {Function} callback
     * @param {Object} [target] - can be null
     */
    public add(key: any, callback: any, target: any) {
        let list = this._callbackTable[key];
        if (!list) {
            list = this._callbackTable[key] = callbackListPool.get();
        }
        list.callbacks.push(callback);
        list.targets.push(target || null);
    }
    /**
     * Check if the specified key has any registered callback. If a callback is also specified,
     * it will only return true if the callback is registered.
     * @method hasEventListener
     * @param {String} key
     * @param {Function} [callback]
     * @param {Object} [target]
     * @return {Boolean}
     */
    public hasEventListener(key: any, callback?: any, target?: any) {
        const list = this._callbackTable[key];
        if (!list) {
            return false;
        }
        // check any valid callback
        const callbacks = list.callbacks;
        if (!callback) {
            // Make sure no cancelled callbacks
            if (list.isInvoking) {
                for (const callbackItem of callbacks) {
                    if (callbackItem) {
                        return true;
                    }
                }
                return false;
            } else {
                return callbacks.length > 0;
            }
        }
        target = target || null;
        const targets = list.targets;
        for (let i = 0; i < callbacks.length; ++i) {
            if (callbacks[i] === callback && targets[i] === target) {
                return true;
            }
        }
        return false;
    }
    /**
     * Removes all callbacks registered in a certain event type or all callbacks registered with a certain target
     * @method removeAll
     * @param {String|Object} keyOrTarget - The event key to be removed or the target to be removed
     */
    public removeAll(keyOrTarget: any) {
        if (typeof keyOrTarget === 'string') {
            // remove by key
            const list = this._callbackTable[keyOrTarget];
            if (list) {
                if (list.isInvoking) {
                    list.cancelAll();
                } else {
                    callbackListPool.put(list);
                    delete this._callbackTable[keyOrTarget];
                }
            }
        } else if (keyOrTarget) {
            // remove by target
            for (const list of this._callbackTable) {
                if (list.isInvoking) {
                    const targets = list.targets;
                    for (let i = 0; i < targets.length; ++i) {
                        if (targets[i] === keyOrTarget) {
                            list.cancel(i);
                        }
                    }
                } else {
                    list.removeBy(list.targets, keyOrTarget);
                }
            }
        }
    }
    /**
     * @method remove
     * @param {String} key
     * @param {Function} callback
     * @param {Object} [target]
     */
    public remove(key: any, callback: any, target: any) {
        const list = this._callbackTable[key];
        if (list) {
            target = target || null;
            const callbacks = list.callbacks;
            const targets = list.targets;
            for (let i = 0; i < callbacks.length; ++i) {
                if (callbacks[i] === callback && targets[i] === target) {
                    if (list.isInvoking) {
                        list.cancel(i);
                    } else {
                        fastRemoveAt(callbacks, i);
                        fastRemoveAt(targets, i);
                    }
                    break;
                }
            }
        }
    }

    public clear() {
        Object.keys(this._callbackTable).forEach((key) => {
            this.removeAll(key);
        });
    }
}
/**
 * !#en The callbacks invoker to handle and invoke callbacks by key.
 * !#zh CallbacksInvoker 用来根据 Key 管理并调用回调方法。
 * @class CallbacksInvoker
 *
 * @extends _CallbacksHandler
 */
class CallbacksInvoker extends CallbacksHandler {
    constructor() {
        super();
    }

    /**
     * @method invoke
     * @param {String} key
     * @param {any} [p1]
     * @param {any} [p2]
     * @param {any} [p3]
     * @param {any} [p4]
     * @param {any} [p5]
     */
    public invoke(key: any, p1?: any, p2?: any, p3?: any, p4?: any, p5?: any) {
        const list = this._callbackTable[key];
        if (list) {
            const rootInvoker = !list.isInvoking;
            list.isInvoking = true;
            const callbacks = list.callbacks;
            const targets = list.targets;
            for (let i = 0, len = callbacks.length; i < len; ++i) {
                const callback = callbacks[i];
                if (callback) {
                    const target = targets[i];
                    if (target) {
                        callback.call(target, p1, p2, p3, p4, p5);
                    } else {
                        callback(p1, p2, p3, p4, p5);
                    }
                }
            }
            if (rootInvoker) {
                list.isInvoking = false;
                if (list.containCanceled) {
                    list.purgeCanceled();
                }
            }
        }
    }

    /**
     * @method emit
     * @param {String} key
     * @param {any} [p1]
     * @param {any} [p2]
     * @param {any} [p3]
     * @param {any} [p4]
     * @param {any} [p5]
     */
    public emit(key: any, p1?: any, p2?: any, p3?: any, p4?: any, p5?: any) {
        const list = this._callbackTable[key];
        if (list) {
            const rootInvoker = !list.isInvoking;
            list.isInvoking = true;
            const callbacks = list.callbacks;
            const targets = list.targets;
            for (let i = 0, len = callbacks.length; i < len; ++i) {
                const callback = callbacks[i];
                if (callback) {
                    const target = targets[i];
                    if (target) {
                        callback.call(target, p1, p2, p3, p4, p5);
                    } else {
                        callback(p1, p2, p3, p4, p5);
                    }
                }
            }
            if (rootInvoker) {
                list.isInvoking = false;
                if (list.containCanceled) {
                    list.purgeCanceled();
                }
            }
        }
    }
}

// @ts-ignore
if (CC_TEST) {
    cc._Test.CallbacksInvoker = CallbacksInvoker;
}
// @ts-ignore
CallbacksInvoker.CallbacksHandler = CallbacksHandler;

export {
    CallbacksHandler,
    CallbacksInvoker,
};
