'use strict';

const { expect } = require('chai');

describe('场景操作测试', () => {

    describe('打开空场景', async () => {

        it('场景广播消息', async () => {
            Tester.Ipc.record();
            await Editor.Ipc.requestToPackage('scene', 'open-scene');

            expect(Tester.Ipc.count('scene:close')).to.equal(1);
            expect(Tester.Ipc.count('scene:ready')).to.equal(1);

            const readyIpc = Tester.Ipc.get('scene:ready', 0);
            const closeIpc = Tester.Ipc.get('scene:close', 0);

            expect(readyIpc.time > closeIpc.time).to.equal(true);
            expect(readyIpc.params[0]).to.equal('');
        });

        it('profile 内的当前场景数据', async () => {
            const profile = Editor.Profile.load('profile://local/packages/scene.json');
            expect(profile.get('current-scene')).to.equal('');
        });

        it('query-current-scene 消息查询返回的数据', async () => {
            const current = await Editor.Ipc.requestToPackage('scene', 'query-current-scene');
            expect(current).to.equal('');
        });
    });

    describe('保存场景', async () => {
        let uuid = '';
        before(async () => {
            uuid = await Editor.Ipc.requestToPackage('scene', 'save-scene');
        });

        it('profile 内的当前场景数据', async () => {
            const profile = Editor.Profile.load('profile://local/packages/scene.json');
            expect(profile.get('current-scene')).to.equal(uuid);
        });

        it('消息查询返回的数据', async () => {
            const current = await Editor.Ipc.requestToPackage('scene', 'query-current-scene');
            expect(current).to.equal(uuid);
        });
    });
});
