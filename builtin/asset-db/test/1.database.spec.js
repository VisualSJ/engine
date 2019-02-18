'use strict';

const { expect } = require('chai');
const { join } = require('path');

const sleep = (time) => new Promise((r) => setTimeout(r, time));

describe('测试 AssetDB 如下 IPC 接口：', () => {

    describe('refresh, query-ready ：刷新数据库', () => {
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
            Editor.Ipc.requestToPackage('asset-db', 'refresh');
            const ready = await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
            expect(ready).to.be.false;

            return new Promise(async (resolve, reject) => {
                async function start() {
                    const ready = await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
                    if (ready) {
                        return resolve();
                    }
                    return await start();
                }
                await start();

                await sleep(30000);
                reject(new Error('限定 30 秒，启动已超时'));
            });
        });
    });

    describe('query-db-info ：查询数据库信息', async () => {

        it('传入错误的参数', async () => {
            return new Promise(async (resolve, reject) => {
                async function start() {
                    const queue = [
                        { args: undefined, expect: null },
                        { args: null, expect: null },
                        { args: '', expect: null },
                        { args: 0, expect: null },
                        { args: false, expect: null },
                        { args: true, expect: null },
                        { args: [], expect: null },
                        { args: {}, expect: null },
                        { args: () => { }, expect: null },
                        { args: 'abc', expect: null },
                        { args: 123, expect: null },
                    ];

                    for (const test of queue) {
                        const result = await Editor.Ipc.requestToPackage('asset-db', 'query-db-info', test.args);
                        expect(result).to.equal(test.expect);
                    }

                    resolve();
                }

                await start();

                await sleep(3000);
                reject(new Error('限定 3 秒，本测试环节已超时'));
            });
        });

        it('传入正确的参数', async () => {
            const queue = [
                {
                    args: 'assets',
                    expect: {
                        keys: ['name', 'target', 'library', 'temp', 'visible', 'readOnly'],
                        values: {
                            name: 'assets',
                            target: join(Editor.Project.path, 'assets'),
                            library: join(Editor.Project.path, 'library'),
                            temp: join(Editor.Project.path, 'temp/asset-db/assets'),
                            visible: true,
                            readOnly: false,
                        },
                    },
                },
                {
                    args: 'internal',
                    expect: {
                        keys: ['name', 'target', 'library', 'temp', 'visible', 'readOnly'],
                        values: {
                            name: 'internal',
                            target: join(Editor.App.path, 'builtin/asset-db/static/internal/assets'),
                            library: join(Editor.Project.path, 'library'),
                            temp: join(Editor.Project.path, 'temp/asset-db/internal'),
                            visible: true,
                            readOnly: false,
                        },
                    },
                },
            ];

            for (const test of queue) {

                const result = await Editor.Ipc.requestToPackage('asset-db', 'query-db-info', test.args);
                expect(result).to.have.all.keys(test.expect.keys);

                for (const key of test.expect.keys) {
                    expect(result[key]).to.equal(test.expect.values[key]);
                }
            }
        });

    });

});
