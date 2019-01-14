'use strict';

const { expect } = require('chai');
const ipc = require('@base/electron-base-ipc');

const sleep = (time) => new Promise((r) => setTimeout(r, time));

describe('Assets 对外暴露的 IPC 接口', () => {

    describe('定位资源并闪烁', () => {
        it('assets:twinkle', async () => {
            const uuid = 'db://assets'; // 根目录
            await Editor.Ipc.requestToPanel('assets', 'twinkle', uuid);

            await sleep(500);

            // TODO ipc 检查结果

        });
    });

});
