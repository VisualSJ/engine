'use strict';

// @ts-ignore
declare const Worker: any;

let isReady = true;
const waitQueue: any = [];

/**
 * 等待 ready 之后继续执行
 */
function waitReady() {
    if (isReady) {
        return;
    }
    return new Promise((resolve) => {
        waitQueue.push(() => {
            resolve();
        });
    });
}

/**
 * 设置 ready 状态
 */
export function setReady() {
    isReady = true;
    while (waitQueue.length > 0) {
        const handler = waitQueue.shift();
        handler();
    }
}

/**
 * 发送 ipc 消息
 * @param message
 * @param params
 */
export function ipcSend(message: string, ...params: any[]) {
    Worker.Ipc.send(message, ...params);
}

/**
 * 接收 ipc 消息
 * @param message
 * @param handler
 */
export function ipcAddListener(message: string, handler: (...args: any[]) => any) {
    Worker.Ipc.on(message, async (...args: any[]) => {
        await waitReady();
        return await handler(...args);
    });
}
