'use strict';

const { expect } = require('chai');
const { join } = require('path');

describe('AssetDB 操作', () => {

    describe('刷新资源数据库', () => {
        let interrupt = false;
        it('当前数据库已经准备就绪', async () => {
            const ready = await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
            interrupt = !ready;
            expect(ready).to.be.true;
        });

        it('刷新数据库', async () => {
            if (interrupt) {
                throw new Error('数据库没有就绪，无法进行刷新测试');
            }
            Editor.Ipc.sendToPackage('asset-db', 'refresh');
            const ready = await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
            expect(ready).to.be.false;
        });

        it('等待刷新完成', () => {
            return new Promise((resolve, reject) => {
                let timer = null;
                async function step() {
                    const ready = await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
                    if (ready) {
                        return resolve();
                    }
                    timer = setTimeout(() => {
                        step();
                    }, 400);
                }
                step();
                setTimeout(() => {
                    clearTimeout(timer);
                    reject(new Error('刷新超时'));
                }, 30000);
            });
        });
    });

    describe('查询数据库参数', async () => {

        it('传入错误、不存在的数据库', async () => {
            let info;
            info = await Editor.Ipc.requestToPackage('asset-db', 'query-db-info');
            expect(info).to.null;

            info = await Editor.Ipc.requestToPackage('asset-db', 'query-db-info', '');
            expect(info).to.null;

            info = await Editor.Ipc.requestToPackage('asset-db', 'query-db-info', 0);
            expect(info).to.null;
        });

        it('查询 assets 数据库', async () => {
            let info = await Editor.Ipc.requestToPackage('asset-db', 'query-db-info', 'assets');
            expect(info).to.have.all.keys('name', 'target', 'library', 'temp', 'visible', 'readOnly');

            expect(info.name).to.equal('assets');
            expect(info.target).to.equal(join(Editor.Project.path, 'assets'));
            expect(info.library).to.equal(join(Editor.Project.path, 'library'));
            expect(info.temp).to.equal(join(Editor.Project.path, 'temp/asset-db/assets'));
            expect(info.visible).to.true;
            expect(info.readOnly).to.false;
        });

    });

});
