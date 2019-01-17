'use strict';

const { expect } = require('chai');
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

const sleep = (time) => new Promise((r) => setTimeout(r, time));

/**
 * 测试以下 ipc 接口
 *
 * DB
 * refresh-database √
 * query-is-ready √
 * query-database-info √
 *
 * 资源查询
 * query-assets √
 * query-asset-info √
 * query-asset-meta √
 * query-asset-path √
 * query-asset-library √
 * query-asset-url √
 * query-url-by-path √
 *
 * 资源增删改
 * create-asset √
 * rename-asset √
 * move-asset
 * copy-asset √
 * save-asset
 * save-asset-meta
 * delete-asset √
 *
 */

describe('Asset-db 对外暴露的 IPC 接口', () => {

    const dbUrl = 'db://assets';
    const fileName = 'New File.txt';
    const fileUrl = `${dbUrl}/${fileName}`;
    const fileSource = join(Editor.Project.path, '/assets/New File.txt');
    const fileMetaSource = join(Editor.Project.path, '/assets/New File.txt.meta');

    const copyFileUrl = dbUrl + '/New File-001.txt';
    const copyFileSource = join(Editor.Project.path, '/assets/New File-001.txt');
    const copyFileMetaSource = join(Editor.Project.path, '/assets/New File-001.txt.meta');

    const fileRename = 'Rename.txt';
    const renameFileUrl = `${dbUrl}/${fileRename}`;
    const renameFileSource = join(Editor.Project.path, '/assets/Rename.txt');
    const renameFileMetaSource = join(Editor.Project.path, '/assets/Rename.txt.meta');

    let assetUrl;
    let assetSource;
    let assetUuid;
    let assetLibrary;

    describe('刷新 refresh-database', () => {
        it('asset-db:refresh-database', async () => {
            Editor.Ipc.sendToPackage('asset-db', 'refresh-database');

            const stop = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
            expect(stop).to.equal(false);

            await sleep(10000); // TODO 这个时间得根据资源的多少决定，资源越多重启等待越久

            const ready = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
            expect(ready).to.equal(true);
        });
    });

    describe('由 DB name 查 DB 信息 query-database-info', () => {
        it('asset-db:query-database-info', async () => {
            const dbInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-database-info', 'assets');

            expect(dbInfo.target).to.equal(join(Editor.Project.path, 'assets'));
        });
    });

    // 以下大部分测试依赖这个新建的结果
    describe('新建 create-asset', () => {
        it('asset-db:create-asset', async () => {
            assetUrl = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', fileUrl, '');
            await sleep(1000); // 这里需要延时，等待 db 数据更新
            expect(existsSync(fileSource)).to.equal(true);
            expect(existsSync(fileMetaSource)).to.equal(true);
        });
    });

    describe('由资源 url 查 DB 信息 query-database-info', () => {
        it('asset-db:query-database-info', async () => {
            const dbInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-database-info', fileUrl);

            expect(dbInfo.target).to.equal(join(Editor.Project.path, 'assets'));
        });
    });

    describe('查询树 query-assets', () => {
        it('asset-db:query-assets', async () => {
             const tree = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

             const isExist = tree.some((one) => one.source === assetUrl);
             expect(isExist).to.equal(true);
        });
    });

    describe('由 url 查磁盘地址 query-asset-path', () => {
        it('asset-db:query-asset-path', async () => {
            assetSource = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', assetUrl);

            expect(assetSource).to.equal(fileSource);
        });
    });

    describe('由 url 查 uuid query-asset-uuid', () => {
        it('asset-db:query-asset-uuid', async () => {
            assetUuid = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', assetUrl);
            const meta = JSON.parse(readFileSync(fileMetaSource));

            expect(assetUuid).to.be.equal(meta.uuid);
        });
    });

    describe('由 uuid 查磁盘 path query-asset-path', () => {
        it('asset-db:query-asset-path', async () => {
            assetSource = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', assetUuid);

            expect(assetSource).to.equal(fileSource);
        });
    });

    describe('由 uuid 查资源信息 query-asset-info', () => {
        it('asset-db:query-asset-info', async () => {
             const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', assetUuid);

             expect(info.source).to.equal(assetUrl);
        });
    });

    describe('由 uuid 查资源 meta query-asset-meta', () => {
        it('asset-db:query-asset-meta', async () => {
             const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', assetUuid);

             expect(meta.uuid).to.equal(assetUuid);
        });
    });

    describe('由 path 查资源 url query-url-by-path', () => {
        it('asset-db:query-url-by-path', async () => {
             const url = await Editor.Ipc.requestToPackage('asset-db', 'query-url-by-path', assetSource);

             expect(url).to.equal(assetUrl);
        });
    });

    describe('由 uuid 查询 library query-asset-library', () => {
        it('asset-db:query-asset-library', async () => {
            assetLibrary = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-library', assetUuid);
            const jsonFile = join(Editor.Project.path, 'library', assetUuid.substr(0, 2), `${assetUuid}.json`);

            expect(assetLibrary['.json']).to.equal(jsonFile);
            expect(existsSync(jsonFile)).to.equal(true);

        });
    });

    // 复制
    describe('复制 copy-asset', () => {
        it('asset-db:copy-asset', async () => {
            const url = await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', assetUrl, dbUrl);

            await sleep(1000); // 需要延时，等待 db 数据更新

            expect(url).to.equal(copyFileUrl);
            expect(existsSync(copyFileSource)).to.equal(true);
            expect(existsSync(copyFileMetaSource)).to.equal(true);

            // 删除复制的文件
            await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', copyFileUrl);
            await sleep(1000); // 需要延时，等待 db 数据更新
        });
    });

    // 重名命
    describe('重名命 rename-asset', () => {
        it('asset-db:rename-asset', async () => {
            const bool = await Editor.Ipc.requestToPackage('asset-db', 'rename-asset', assetUuid, fileRename);

            await sleep(1000); // 需要延时，等待 db 数据更新

            expect(bool).to.equal(true);
            expect(existsSync(renameFileSource)).to.equal(true);
            expect(existsSync(renameFileMetaSource)).to.equal(true);

            // 还原重名命
            await Editor.Ipc.requestToPackage('asset-db', 'rename-asset', assetUuid, fileName);
            await sleep(1000); // 需要延时，等待 db 数据更新
        });
    });

    // 删除
    describe('由 url 删除资源', () => {
        it('asset-db:delete-asset', async () => {
            const bool = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', assetUrl);

            expect(bool).to.equal(true);
            expect(existsSync(fileSource)).to.equal(false);
            expect(existsSync(fileMetaSource)).to.equal(false);
            expect(existsSync(assetLibrary)).to.equal(false);
        });
    });
});
