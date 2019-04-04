'use strict';

const { expect } = require('chai');

describe('场景查询测试', () => {

    before(async () => {
        await Editor.Ipc.requestToPackage('scene', 'open-scene');
    });

    describe('query-is-ready', async () => {
        const isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

        it('场景准备就绪', async () => {
            expect(isReady).to.equal(true);
        });
    });

    let uuid;
    describe('query-node-tree', async () => {
        const dump_empty = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');

        it('场景树格式', async () => {
            expect(dump_empty.type).to.equal('cc.Scene');
            expect(dump_empty.active).to.equal(true);
            expect(dump_empty.name).to.equal('New Node');
            expect(dump_empty.parent).to.equal('');
        });

        it('场景树节点数据', () => {
            uuid = dump_empty.children[0].uuid;
            expect(dump_empty.children.length).to.equal(2);
            expect(dump_empty.children[0].name).to.equal('Main Light');
            expect(dump_empty.children[1].name).to.equal('Camera');
        });
    });

    describe('query-node', async () => {
        const dump = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);

        it('节点数据', () => {
            expect(!!dump).to.equal(true);
            expect(dump.uuid.value).to.equal(uuid);
        });
    });

    describe('query-dirty', async () => {
        const dirty = await Editor.Ipc.requestToPackage('scene', 'query-dirty', uuid);

        it('场景未修改', () => {
            expect(dirty).to.equal(false);
        });
    });

    describe('query-component-function-of-node', async () => {
        const map = await Editor.Ipc.requestToPackage('scene', 'query-component-function-of-node', uuid);

        it('cc.LightComponent', () => {
            expect(!!map['cc.LightComponent']).to.equal(true);
            expect(map['cc.LightComponent'].length).to.not.equal(0);
        });
    });
});
