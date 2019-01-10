'use strict';

const { expect } = require('chai');

describe('Hierarchy 对外暴露的 IPC 接口', () => {

     describe('定位节点并闪烁', () => {
        it('hierarchy:twinkle', async () => {
            const uuid = '68al7ENjpKa7hrzi3sVEYt'; // uuid 会变化，暂用
            Editor.Ipc.requestToPanel('hierarchy', 'twinkle', uuid);
        });
    });

 });
