'use strict';

const { expect } = require('chai');
const ipc = require('@base/electron-base-ipc');
const {getErrors} = require('./../dist/socket');

describe('预览消息通知测试', () => {
    describe('get-device：获取预览支持的设备信息', () => {
        it('get-device：', async () => {
            let device = await Editor.Ipc.requestToPackage('preview', 'get-device');
            expect(device.android_800.height).to.equal(800);
        });
    });

    describe('get-port', () => {
        it('get-port', async () => {
            let port = await Editor.Ipc.requestToPackage('preview', 'get-port');
            expect(port).to.be.a('number');
        });
    });

    describe('change-platform && get-platform', () => {
        it('change-platform && get-platform', async () => {
            Editor.Ipc.sendToPackage('preview', 'change-platform', 'simulator');
            let platform = await Editor.Ipc.requestToPackage('preview', 'get-platform');
            expect(platform).to.equal('simulator');
        });
    });

    describe('open-terminal:打开终端预览', () => {
        before(() => {
            Editor.Ipc.sendToPackage('preview', 'change-platform', 'browser');
            Editor.Ipc.sendToPackage('preview', 'open-terminal');
        });
        it('open-terminal:打开终端预览,连接设备数至少为 1', async () => {
            let num = await (() => {
                return new Promise((resolve) => {
                    ipc.on('editor3d-lib-theme:use', (event, num) => {
                        resolve(num);
                    });
                });
            })();
            expect(num).to.be.at.least(1);
        });

        it('预览客户端不报错', () => {
            let errors = getErrors();
            expect(errors).to.have.lengthOf(0);
        });
    });

    describe('reload-terminal', () => {
        it('reload-terminal');
    });

    describe('set-build-path', () => {
        it('set-build-path');
    });
});
