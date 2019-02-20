'use strict';

const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const { expect } = require('chai');

const sleep = (time) => new Promise((r) => setTimeout(r, time));

describe('测试 DB 中 Asset 查询的 IPC 接口：', () => {

    describe('query-assets ：查询资源树', async () => {

        it('传入错误的参数', async () => {
            return new Promise(async (resolve, reject) => {
                async function start() {
                    const queue = [
                        { args: '', expect: null },
                        { args: 0, expect: null },
                        { args: false, expect: null },
                        { args: true, expect: null },
                        { args: [], expect: null },
                        { args: 'abc', expect: null },
                        { args: 123, expect: null },
                    ];

                    for (const test of queue) {
                        const result = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', test.args);
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
            const expectValues = {
                dbs: ['db://assets', 'db://internal'],
                firstItem: {
                    keys: [
                        'file',
                        'importer',
                        'isDirectory',
                        'library',
                        'name',
                        'readOnly',
                        'source',
                        'subAssets',
                        'type',
                        'uuid',
                        'visible',
                    ],
                    values: {
                        file: join(Editor.App.path, 'builtin/asset-db/static/internal/assets'),
                        importer: 'database',
                        isDirectory: false,
                        library: {},
                        name: 'internal',
                        readOnly: false,
                        source: 'db://internal',
                        subAssets: {},
                        type: 'database',
                        uuid: 'db://internal',
                        visible: true,
                    },
                },
            };

            // 正确的数据格式；有规律的情况
            const queueA = [
                {
                    args: undefined,
                    expect: expectValues,
                },
                {
                    args: null,
                    expect: expectValues,
                },
                {
                    args: () => {},
                    expect: expectValues,
                },
                {
                    args: {},
                    expect: expectValues,
                },
                {
                    args: {
                        /**
                         * pattern 应该是 string
                         * 所以这个是错误参数，
                         * 但由于功能特性，这里的错误参数只影响数据过滤，
                         * 不影响最后的数据输出
                         */
                        pattern: false,
                    },
                    expect: expectValues,
                },
                {
                    args: {
                        // 同上
                        type: false,
                    },
                    expect: expectValues,
                },
            ];
            for (const test of queueA) {
                const result = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', test.args);

                // 必要要存在的数据库数据
                for (const dbname of test.expect.dbs) {
                    const list = result.filter((item) => item.source.startsWith(dbname));
                    if (list.length === 0) {
                        throw new Error(`查询数据中缺少 ${dbname} 的数据库数据`);
                    }
                }

                // 验证单个资源的格式
                const firstItem = result[0];
                expect(firstItem).to.have.all.keys(test.expect.firstItem.keys);

                for (const key of test.expect.firstItem.keys) {
                    // eql 值相等; equal 类型相等
                    expect(firstItem[key]).to.eql(test.expect.firstItem.values[key]);
                }
            }

            // 正确的数据格式：特例的情况
            const queueB = [
                {
                    args: {
                        pattern: 'db://internal/**/*.prefab',
                    },
                    expect(result) {
                        // 全部数据都必须来自 internal 库
                        const list = result.filter((item) => item.source.startsWith('db://internal'));
                        if (list.length !== result.length) {
                            throw new Error(`pattern 查询中有其他数据库的数据`);
                        }

                        // 全部数据必须都是 prefab
                        const types = result.filter((item) => item.source.endsWith('.prefab'));
                        if (types.length !== result.length) {
                            throw new Error(`pattern 查询中有其他类型的数据`);
                        }
                    },
                },
                {
                    args: {
                        type: 'scripts',
                    },
                    expect(result) {
                        // 全部数据都必须是符合的类型
                        const importer = [
                            'javascript',
                            'typescript',
                        ];
                        const types = result.filter((item) => importer.includes(item.importer));
                        if (types.length !== result.length) {
                            throw new Error(`type = 'scripts' 查询中有其他类型的数据`);
                        }
                    },
                },
                {
                    args: {
                        // 两个参数一起测试
                        pattern: 'db://internal/**/*',
                        type: 'image',
                    },
                    expect(result) {
                        // 全部数据都必须来自 internal 库
                        const list = result.filter((item) => item.source.startsWith('db://internal'));
                        if (list.length !== result.length) {
                            throw new Error(`pattern 查询中有其他数据库的数据`);
                        }

                        // 全部数据都必须是符合的类型
                        const importer = [
                            'image',
                            'textrue',
                        ];
                        const types = result.filter((item) => importer.includes(item.importer));
                        if (types.length !== result.length) {
                            throw new Error(`type = 'image' 查询中有其他类型的数据`);
                        }
                    },
                },
            ];
            for (const test of queueB) {
                const result = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', test.args);
                test.expect(result);
            }
        });

    });

    return; //  TODO 开发到这里，以上先提交

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

return; //  TODO 开发到这里，以上先提交

describe('测试 DB 中 Asset 增删改的 IPC 接口：', () => {
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
