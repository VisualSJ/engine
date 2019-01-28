'use strict';

const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const { expect } = require('chai');

describe('查询资源信息', () => {

    describe('查询资源树', async () => {
        const tree = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

        it('资源树包含起码两个数据库', () => {
            const list = tree.filter((item) => item.uuid.startsWith('db://'));
            expect(list).to.not.be.empty;
            expect(list).to.have.length.least(2);
        });

        it('资源树只包含实际资源', () => {
            const list = tree.filter((item) => !item.source);
            expect(list).to.be.empty;
        });
    });

    describe('查询资源信息', async () => {

        it('传入错误、不存在的资源', async () => {
            let info;
            info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info');
            expect(info).to.null;

            info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', '');
            expect(info).to.null;

            info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', 0);
            expect(info).to.null;
        });

        it('查询 assets 数据库资源', async () => {
            const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', 'db://assets');
            expect(info).to.have.all.keys(
                'name', 'source', 'file', 'uuid', 'importer', 'type', 'isDirectory', 'library', 'subAssets',
                'visible', 'readOnly'
            );
        });
    });

    describe('查询资源 meta', () => {

        it('传入错误、不存在的资源', async () => {
            let info;
            info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta');
            expect(info).to.null;

            info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', '');
            expect(info).to.null;

            info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', 0);
            expect(info).to.null;
        });

        it('查询 assets 数据库资源的 meta', async () => {
            const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', 'db://assets');
            expect(meta).to.have.all.keys('imported', 'files', 'importer', 'subMetas', 'userData', 'uuid', 'ver');
        });
    });

});

describe('操作数据库', () => {
    const name1 = (new Date()).getTime() + '_1';
    const name2 = (new Date()).getTime() + '_2';

    let uuid;

    describe('创建资源', async () => {
        // TODO 传入错误资源的处理
        uuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', `db://assets/${name1}`, 'test');
        expect(uuid).to.have.lengthOf(36);
    });

    describe('移动资源', async () => {

        it('传入错误的数据', async () => {
            let bool;

            bool = await Editor.Ipc.requestToPackage('asset-db', 'move-asset');
            expect(bool).to.be.false;
            bool = await Editor.Ipc.requestToPackage('asset-db', 'move-asset', `db://assets/${name2}`);
            expect(bool).to.be.false;
        });

        it('移动 name2 到 name1', async () => {
            await Editor.Ipc.requestToPackage('asset-db', 'move-asset', `db://assets/${name2}`, `db://assets/${name1}`);

            const oldFileExists = existsSync(join(Editor.Project.path, `assets/${name2}`));
            expect(oldFileExists).to.be.false;
            const newFileExists = existsSync(join(Editor.Project.path, `assets/${name1}`));
            expect(newFileExists).to.be.true;
        });
    });

    describe('复制资源', async () => {

        it('传入错误的数据', async () => {
            let bool;

            bool = await Editor.Ipc.requestToPackage('asset-db', 'copy-asset');
            expect(bool).to.be.false;
            bool = await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', `db://assets/${name2}`);
            expect(bool).to.be.false;
        });

        it('复制 name1', async () => {
            await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', `db://assets/${name1}`, `db://assets/${name2}`);

            const oldFileExists = existsSync(join(Editor.Project.path, `assets/${name1}`));
            expect(oldFileExists).to.be.true;
            const newFileExists = existsSync(join(Editor.Project.path, `assets/${name2}`));
            expect(newFileExists).to.be.true;
        });
    });

    describe('保存资源', async () => {

        it('传入错误的数据', async () => {
            let bool;

            bool = await Editor.Ipc.requestToPackage('asset-db', 'save-asset');
            expect(bool).to.be.false;
            bool = await Editor.Ipc.requestToPackage('asset-db', 'save-asset', `db://assets/${name2}`);
            expect(bool).to.be.false;
        });

        it(`保存 ${uuid}`, async () => {
            await Editor.Ipc.requestToPackage('asset-db', 'save-asset', uuid, 'data');

            const str = readFileSync(join(Editor.Project.path, `assets/${name1}`), 'utf8');
            expect(str).to.be.equals('data');
        });
    });

    describe('保存资源 meta', async () => {
        // TODO meta 接口太简陋，重新完成后来写测试
        // await Editor.Ipc.requestToPackage('asset-db', 'save-asset-meta', uuid1, name2);
        // TODO expect
    });

    describe('删除资源', async () => {

        it('传入错误的数据', async () => {
            let bool;

            bool = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset');
            expect(bool).to.be.false;
            bool = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', `db://assets/ddd`);
            expect(bool).to.be.false;
        });

        it(`删除资源`, async () => {
            let exists;

            await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', `db://assets/${name1}`);
            exists = existsSync(join(Editor.Project.path, `assets/${name1}`));
            expect(exists).to.be.false;

            await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', `db://assets/${name2}`);
            exists = existsSync(join(Editor.Project.path, `assets/${name2}`));
            expect(exists).to.be.false;
        });
    });
});
