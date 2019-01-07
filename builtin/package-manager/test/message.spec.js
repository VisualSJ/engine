'use strict';

const { expect } = require('chai');

describe('插件管理器消息接口测试', () => {
    describe('get-packgaes', () => {
        it('查询插件包信息', async () => {
            const packges = await Editor.Ipc.requestToPackage('package-manager', 'get-packgaes');
            expect(packges).to.be.a('array');
        });
    });
});
