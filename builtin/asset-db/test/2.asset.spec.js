'use strict';

const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const { expect } = require('chai');

const randomName = Date.now().toString();
const dbUrl = 'db://assets';
const dirUrl = `${dbUrl}/dir`;
const dirPath = join(Editor.Project.path, 'assets/dir');
const fileUrl = `${dbUrl}/file`;
const filePath = join(Editor.Project.path, 'assets/file');

const dbAsset = {
    addDir: {
        url: `${dirUrl}-${randomName}`,
        path: `${dirPath}-${randomName}`,

        urlWithSpace: `${dirUrl} ${randomName}`,
        pathWithSpace: `${dirPath} ${randomName}`,
    },
    addFile: {
        url: `${fileUrl}-${randomName}`,
        path: `${filePath}-${randomName}`,

        urlWithSpace: `${fileUrl} ${randomName}`,
        pathWithSpace: `${filePath} ${randomName}`,

        contentEmpty: '',
        contentString: 'Test',
        contentBuffer: Buffer.from('Buffer Test'),
    },
};

// 选取 db://internal 里面较为固定的资源作为 查询类型 的测试用例
const dbInternal = {
    prefab: {
        button: {
            uuid: '90bdd2a9-2838-4888-b66c-e94c8b7a5169',
            url: 'db://internal/default_prefab/ui/Button.prefab',
            availableUrl001: 'db://internal/default_prefab/ui/Button-001.prefab',
            path: join(Editor.App.path, 'builtin/asset-db/static/internal/assets/default_prefab/ui/Button.prefab'),
        },
    },
};

// 以下对应功能代码 asset-db/source/browser/index.ts 上的接口顺序

describe('测试 DB 中 Asset 查询的 IPC 接口：', () => {

    // ------- 地址转换
    describe('------ 地址转换', () => {
        describe('query-path-by-url ：由 path 查资源 url', () => {

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
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'query-path-by-url', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                const queue = [
                    {
                        args: dbInternal.prefab.button.url,
                        expect: dbInternal.prefab.button.path,
                    },
                ];

                for (const test of queue) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'query-path-by-url', test.args);
                    expect(result).to.equal(test.expect);
                }
            });

        });

        describe('query-url-by-path ：由 url 查资源 path', () => {

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
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'query-url-by-path', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                const queue = [
                    {
                        args: dbInternal.prefab.button.path,
                        expect: dbInternal.prefab.button.url,
                    },
                ];

                for (const test of queue) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'query-url-by-path', test.args);
                    expect(result).to.equal(test.expect);
                }
            });

        });

    });

    // ------ 资源查询
    describe('------ 资源查询', () => {
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
                        args: () => { },
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

        describe('query-asset-info ：查询资源信息', async () => {

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
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                const expectValues = {
                    keys: ['name', 'source', 'file', 'uuid', 'importer', 'type',
                        'isDirectory', 'library', 'subAssets', 'visible', 'readOnly'],
                    values: {
                        name: 'string',
                        source: 'string',
                        file: 'string',
                        uuid: 'string',
                        importer: 'string',
                        type: 'string',
                        isDirectory: 'boolean',
                        library: 'object',
                        subAssets: 'object',
                        visible: 'boolean',
                        readOnly: 'boolean',
                    },

                };
                const queue = [
                    {
                        args: 'db://internal',
                        expect: expectValues,
                    },
                    {
                        args: dbInternal.prefab.button.uuid,
                        expect: expectValues,
                    },
                ];

                for (const test of queue) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', test.args);

                    expect(result).to.have.all.keys(test.expect.keys);
                    for (const key of test.expect.keys) {
                        expect(result[key]).to.be.a(test.expect.values[key]);
                    }
                }
            });

        });

        describe('query-asset-meta ：查询资源 meta', () => {

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
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                const expectValues = {
                    keys: ['ver', 'importer', 'imported', 'uuid', 'files', 'subMetas', 'userData'],
                    values: {
                        ver: 'string',
                        importer: 'string',
                        imported: 'boolean',
                        uuid: 'string',
                        files: 'array',
                        subMetas: 'object',
                        userData: 'object',
                    },

                };
                const queue = [
                    {
                        args: dbInternal.prefab.button.uuid,
                        expect: expectValues,
                    },
                ];

                for (const test of queue) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', test.args);

                    expect(result).to.have.all.keys(test.expect.keys);
                    for (const key of test.expect.keys) {
                        expect(result[key]).to.be.a(test.expect.values[key]);
                    }
                }
            });
        });

        describe('query-asset-uuid ：查询资源 uuid', () => {

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
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                const queue = [
                    {
                        args: dbUrl,
                        expect: dbUrl,
                    },
                    {
                        args: dbInternal.prefab.button.url,
                        expect: dbInternal.prefab.button.uuid,
                    },
                ];

                for (const test of queue) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', test.args);
                    expect(result).to.equal(test.expect);
                }
            });
        });

    });

});

describe('测试 DB 中 Asset 增删改的 IPC 接口：', () => {

    // ----- 增删资源
    describe('------ 增删资源', () => {
        describe('generate-available-url ：返回可用格式的 url', async () => {

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
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'generate-available-url', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                const queue = [
                    {
                        args: dbInternal.prefab.button.url,
                        expect: dbInternal.prefab.button.availableUrl001,
                    },
                    {
                        args: dbInternal.prefab.button.availableUrl001,
                        expect: dbInternal.prefab.button.availableUrl001,
                    },
                ];

                for (const test of queue) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'generate-available-url', test.args);
                    expect(result).to.equal(test.expect);
                }
            });

        });

        describe('create-asset, delete-asset ：新增资源, 删除资源', async () => {

            it('新增：传入错误的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            { args: [undefined], expect: null },
                            { args: [null], expect: null },
                            { args: [''], expect: null },
                            { args: [0], expect: null },
                            { args: [false], expect: null },
                            { args: [true], expect: null },
                            { args: [[]], expect: null },
                            { args: [{}], expect: null },
                            { args: [() => { }], expect: null },
                            { args: ['abc'], expect: null },
                            { args: [123], expect: null },
                            { args: [dbAsset.addDir.url, []], expect: null },
                            { args: [dbAsset.addDir.url, {}], expect: null },
                            { args: [dbAsset.addDir.url, false], expect: null },
                            { args: [dbAsset.addDir.url, 123], expect: null },
                        ];

                        for (const test of queue) {
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', ...test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('删除：传入错误的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            { args: undefined, expect: false },
                            { args: null, expect: false },
                            { args: '', expect: false },
                            { args: 0, expect: false },
                            { args: false, expect: false },
                            { args: true, expect: false },
                            { args: [], expect: false },
                            { args: {}, expect: false },
                            { args: () => { }, expect: false },
                            { args: 'abc', expect: false },
                            { args: 123, expect: false },
                        ];

                        for (const test of queue) {
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数：新增后删除', async () => {
                const queue = [
                    { // 创建文件夹，名称连续
                        args: [dbAsset.addDir.url],
                        expect: {
                            url: dbAsset.addDir.url,
                            path: dbAsset.addDir.path,
                        },
                    },
                    { // 创建文件夹：名称带有空格, 函数传过去为 null
                        args: [dbAsset.addDir.urlWithSpace, () => { }],
                        expect: {
                            url: dbAsset.addDir.urlWithSpace,
                            path: dbAsset.addDir.pathWithSpace,
                        },
                    },
                    { // 创建文件：空内容
                        args: [dbAsset.addFile.url, dbAsset.addFile.contentEmpty],
                        expect: {
                            url: dbAsset.addFile.url,
                            path: dbAsset.addFile.path,
                            content: dbAsset.addFile.contentEmpty,
                        },
                    },
                    { // 创建文件：字符串内容
                        args: [dbAsset.addFile.urlWithSpace, dbAsset.addFile.contentString],
                        expect: {
                            url: dbAsset.addFile.urlWithSpace,
                            path: dbAsset.addFile.pathWithSpace,
                            content: dbAsset.addFile.contentString,
                        },
                    },
                    { // 创建文件：Buffer 内容
                        args: [dbAsset.addFile.urlWithSpace, dbAsset.addFile.contentBuffer],
                        expect: {
                            url: dbAsset.addFile.urlWithSpace,
                            path: dbAsset.addFile.pathWithSpace,
                            content: dbAsset.addFile.contentBuffer.toString(),
                        },
                    },
                ];

                for (const test of queue) {
                    // 新增
                    const uuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', ...test.args);

                    expect(uuid).to.be.a('string');
                    const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
                    expect(info.source).to.equal(test.expect.url); // db 数据存在

                    // tslint:disable-next-line:max-line-length
                    const filePath = await Editor.Ipc.requestToPackage('asset-db', 'query-path-by-url', test.expect.url);
                    expect(filePath).to.equal(test.expect.path);
                    expect(existsSync(filePath)).to.true; // 磁盘文件存在
                    expect(existsSync(`${filePath}.meta`)).to.true;

                    // 再检查一次内容
                    if (test.expect.content !== undefined) {
                        const content = readFileSync(filePath, 'utf8');
                        expect(content).to.be.equal(test.expect.content);
                    }

                    // 删除
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', test.expect.url);
                    expect(result).to.be.true;

                    expect(existsSync(filePath)).to.false; // 磁盘文件也不存在了
                    expect(existsSync(`${filePath}.meta`)).to.false;

                }
            });

        });

    });

    // ----- 复制资源
    describe('------ 复制资源', () => {

        describe('copy-asset ：复制资源', async () => {

            it('传入错误的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            { args: [undefined, undefined], expect: false },

                            { args: [undefined, dirUrl], expect: false },
                            { args: [null, dirUrl], expect: false },
                            { args: ['', dirUrl], expect: false },
                            { args: [0, dirUrl], expect: false },
                            { args: [false, dirUrl], expect: false },
                            { args: [true, dirUrl], expect: false },
                            { args: [[], dirUrl], expect: false },
                            { args: [{}, dirUrl], expect: false },
                            { args: [() => { }, dirUrl], expect: false },
                            { args: ['abc', dirUrl], expect: false },
                            { args: [123, dirUrl], expect: false },

                            { args: [dbInternal.prefab.button.url, undefined], expect: false },
                            { args: [dbInternal.prefab.button.url, null], expect: false },
                            { args: [dbInternal.prefab.button.url, ''], expect: false },
                            { args: [dbInternal.prefab.button.url, 0], expect: false },
                            { args: [dbInternal.prefab.button.url, false], expect: false },
                            { args: [dbInternal.prefab.button.url, true], expect: false },
                            { args: [dbInternal.prefab.button.url, []], expect: false },
                            { args: [dbInternal.prefab.button.url, {}], expect: false },
                            { args: [dbInternal.prefab.button.url, () => { }], expect: false },
                            { args: [dbInternal.prefab.button.url, 'abc'], expect: false },
                            { args: [dbInternal.prefab.button.url, 123], expect: false },

                            // 源地址被目标地址包含
                            { args: [dbUrl, dirUrl], expect: false },
                            // 源文件不存在
                            { args: [dbInternal.prefab.button.availableUrl001, dirUrl], expect: false },
                            // 目标文件已经存在
                            { args: [dbInternal.prefab.button.url, dbUrl], expect: false },
                            // 目标文件的父级文件夹被锁定 TODO 锁定的情况新开一个条件测试
                            // tslint:disable-next-line:max-line-length
                            // { args: [dbInternal.prefab.button.url, dbInternal.prefab.button.availableUrl001], expect: false },
                        ];

                        for (const test of queue) {
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', ...test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数：新增-复制-删除', async () => {
                const queue = [
                    { // 复制文件夹
                        createArgs: [dbAsset.addDir.url],
                        args: [dbAsset.addDir.url, `${dbAsset.addDir.url}-001`],
                        expect: {
                            path: `${dbAsset.addDir.path}-001`,
                        },
                    },
                    { // 复制文件夹: 名成带空格
                        createArgs: [dbAsset.addDir.urlWithSpace],
                        args: [dbAsset.addDir.urlWithSpace, `${dbAsset.addDir.urlWithSpace}-001`],
                        expect: {
                            path: `${dbAsset.addDir.pathWithSpace}-001`,
                        },
                    },
                    { // 复制文件
                        createArgs: [dbAsset.addFile.url, ''],
                        args: [dbAsset.addFile.url, `${dbAsset.addFile.url}-001`],
                        expect: {
                            path: `${dbAsset.addFile.path}-001`,
                        },
                    },
                    { // 复制文件: 名成带空格
                        createArgs: [dbAsset.addFile.urlWithSpace, ''],
                        args: [dbAsset.addFile.urlWithSpace, `${dbAsset.addFile.urlWithSpace}-001`],
                        expect: {
                            path: `${dbAsset.addFile.pathWithSpace}-001`,
                        },
                    },
                ];

                for (const test of queue) {
                    // 新增
                    const uuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', ...test.createArgs);
                    expect(uuid).to.be.a('string');

                    // 复制
                    const copy = await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', ...test.args);
                    expect(copy).to.be.true;

                    // tslint:disable-next-line:max-line-length
                    const filePath = await Editor.Ipc.requestToPackage('asset-db', 'query-path-by-url', test.args[1]);
                    expect(filePath).to.equal(test.expect.path);
                    expect(existsSync(filePath)).to.true; // 磁盘文件存在
                    expect(existsSync(`${filePath}.meta`)).to.true;

                    // 删除
                    const delSource = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', test.args[0]);
                    expect(delSource).to.be.true;
                    const delTarget = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', test.args[1]);
                    expect(delTarget).to.be.true;
                }
            });

        });

    });

    // ----- 移动(重命名)资源
    describe('------ 移动(重命名)资源', () => {

        describe('move-asset ：移动(重命名)资源', async () => {
            const dirUrl001 = `${dirUrl}-001`;
            const dirsArr = [dirUrl, dirUrl001];
            // 先新增一个文件，确保移动的第一个参数：源文件存在
            const fileUrl = dbAsset.addFile.url;
            const fileUrl001 = `${fileUrl}-001`;
            // 新增一个文件夹里的文件，确保移动的第二参数：目标文件存在
            const dirFileUrl = `${dirUrl}/${randomName}`;
            const filesArr = [fileUrl, fileUrl001, dirFileUrl];

            it('测试前准备工作', async () => {
                // 先创建文件夹
                for (const url of dirsArr) {
                    // tslint:disable-next-line:max-line-length
                    const uuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url);
                    expect(uuid).to.be.a('string');
                }

                for (const url of filesArr) {
                    // tslint:disable-next-line:max-line-length
                    const uuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, '');
                    expect(uuid).to.be.a('string');
                }
            });

            it('传入错误的参数', async () => {

                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queueA = [
                            { args: [undefined, undefined], expect: false },

                            { args: [undefined, dirUrl], expect: false },
                            { args: [null, dirUrl], expect: false },
                            { args: ['', dirUrl], expect: false },
                            { args: [0, dirUrl], expect: false },
                            { args: [false, dirUrl], expect: false },
                            { args: [true, dirUrl], expect: false },
                            { args: [[], dirUrl], expect: false },
                            { args: [{}, dirUrl], expect: false },
                            { args: [() => { }, dirUrl], expect: false },
                            { args: ['abc', dirUrl], expect: false },
                            { args: [123, dirUrl], expect: false },
                        ];
                        for (const test of queueA) {
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'move-asset', ...test.args);
                            expect(result).to.equal(test.expect);
                        }

                        // 测试数据 B 组
                        const queueB = [
                            { args: [fileUrl, undefined], expect: false },
                            { args: [fileUrl, null], expect: false },
                            { args: [fileUrl, ''], expect: false },
                            { args: [fileUrl, 0], expect: false },
                            { args: [fileUrl, false], expect: false },
                            { args: [fileUrl, true], expect: false },
                            { args: [fileUrl, []], expect: false },
                            { args: [fileUrl, {}], expect: false },
                            { args: [fileUrl, () => { }], expect: false },
                            { args: [fileUrl, 'abc'], expect: false },
                            { args: [fileUrl, 123], expect: false },

                            // 源地址被目标地址包含
                            { args: [dbUrl, dirUrl], expect: false },
                            // 源文件不存在
                            { args: [dirUrl, fileUrl], expect: false },
                            // 目标文件已经存在
                            { args: [fileUrl, dirFileUrl], expect: false },
                            // TODO 源文件被锁定的情况
                            // TODO 目标文件的父级文件夹被锁定的情况
                        ];
                        for (const test of queueB) {
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'move-asset', ...test.args);

                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数：新增-移动(重命名)-删除', async () => {

                const queue = [
                    { // 移入：一个文件夹移入另一个文件夹
                        args: [dirUrl001, `${dirUrl}/dir-001`],
                        expect: {
                            path: join(dirPath, 'dir-001'),
                        },
                    },
                    { // 对应上步移出文件夹
                        args: [`${dirUrl}/dir-001`, dirUrl001],
                        expect: {
                            path: `${dirPath}-001`,
                        },
                    },
                    { // 重命名：同时检查名称带有空格的重命名
                        args: [dirUrl001, `${dirUrl} 002`],
                        expect: {
                            path: `${dirPath} 002`,
                        },
                    },
                    { // 对应上步恢复重命名
                        args: [`${dirUrl} 002`, dirUrl001],
                        expect: {
                            path: `${dirPath}-001`,
                        },
                    },
                ];

                for (const test of queue) {
                    const move = await Editor.Ipc.requestToPackage('asset-db', 'move-asset', ...test.args);
                    expect(move).to.be.true;

                    // tslint:disable-next-line:max-line-length
                    const filePath = await Editor.Ipc.requestToPackage('asset-db', 'query-path-by-url', test.args[1]);
                    expect(filePath).to.equal(test.expect.path);
                    expect(existsSync(filePath)).to.true; // 磁盘文件存在
                    expect(existsSync(`${filePath}.meta`)).to.true;

                }
            });

            it('测试后清理', async () => {
                // 测试后删除之前新增的文件, 文件夹
                for (const url of filesArr) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', url);
                    expect(result).to.be.true;
                }

                for (const url of dirsArr) {
                    const result = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', url);
                    expect(result).to.be.true;
                }
            });
        });

    });

    // ----- 保存资源
    describe('------ 保存资源', () => {

        describe('save-asset: 保存 Asset', () => {

            const fileUrl = dbAsset.addFile.url;
            const filePath = dbAsset.addFile.path;
            let fileUuid = '';

            it('测试前准备工作', async () => {
                fileUuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', fileUrl, '');
                expect(fileUuid).to.be.a('string');
            });

            it('传入错误的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            { args: [undefined, undefined], expect: false },

                            { args: [undefined, ''], expect: false },
                            { args: [null, ''], expect: false },
                            { args: ['', ''], expect: false },
                            { args: [0, ''], expect: false },
                            { args: [false, ''], expect: false },
                            { args: [true, ''], expect: false },
                            { args: [[], ''], expect: false },
                            { args: [{}, ''], expect: false },
                            { args: [() => { }, ''], expect: false },
                            { args: ['abc', ''], expect: false },
                            { args: [123, ''], expect: false },

                            { args: [fileUuid, undefined], expect: false },
                            { args: [fileUuid, null], expect: false },
                            { args: [fileUuid, 0], expect: false },
                            { args: [fileUuid, false], expect: false },
                            { args: [fileUuid, true], expect: false },
                            { args: [fileUuid, []], expect: false },
                            { args: [fileUuid, {}], expect: false },
                            { args: [fileUuid, () => { }], expect: false },
                            { args: [fileUuid, 123], expect: false },
                        ];

                        for (const test of queue) {
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'save-asset', ...test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            {
                                args: [fileUuid, dbAsset.addFile.contentString],
                                expect: dbAsset.addFile.contentString,
                            },
                            {
                                args: [fileUuid, dbAsset.addFile.contentBuffer],
                                expect: dbAsset.addFile.contentBuffer.toString(),
                            },
                        ];

                        for (const test of queue) {
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'save-asset', ...test.args);
                            expect(result).to.be.true;

                            const content = readFileSync(filePath, 'utf8');
                            expect(content).to.be.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('测试后清理', async () => {
                const result = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', fileUrl);
                expect(result).to.be.true;
            });

        });

        describe('save-asset-meta: 保存 Meta', () => {
            const fileUrl = dbAsset.addFile.url;
            const filePath = `${dbAsset.addFile.path}.meta`;
            let fileUuid = '';
            const fileContent = `
            {
                "userData": {
                    "fileUrl": "${fileUrl}"
                }
            }
            `;

            it('测试前准备工作', async () => {
                fileUuid = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', fileUrl, '');
                expect(fileUuid).to.be.a('string');
            });

            it('传入错误的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            { args: [undefined, undefined], expect: false },

                            { args: [undefined, ''], expect: false },
                            { args: [null, ''], expect: false },
                            { args: ['', ''], expect: false },
                            { args: [0, ''], expect: false },
                            { args: [false, ''], expect: false },
                            { args: [true, ''], expect: false },
                            { args: [[], ''], expect: false },
                            { args: [{}, ''], expect: false },
                            { args: [() => { }, ''], expect: false },
                            { args: ['abc', ''], expect: false },
                            { args: [123, ''], expect: false },

                            { args: [fileUuid, undefined], expect: false },
                            { args: [fileUuid, null], expect: false },
                            { args: [fileUuid, 0], expect: false },
                            { args: [fileUuid, false], expect: false },
                            { args: [fileUuid, true], expect: false },
                            { args: [fileUuid, []], expect: false },
                            { args: [fileUuid, {}], expect: false },
                            { args: [fileUuid, () => { }], expect: false },
                            { args: [fileUuid, 123], expect: false },
                            { args: [fileUuid, '[]'], expect: false },
                            { args: [fileUuid, ''], expect: false },
                        ];

                        for (const test of queue) {
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'save-asset-meta', ...test.args);
                            expect(result).to.equal(test.expect);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('传入正确的参数', async () => {
                return new Promise(async (resolve, reject) => {
                    async function start() {
                        const queue = [
                            {
                                args: [fileUuid, fileContent],
                                expect: fileContent,
                            },
                        ];

                        for (const test of queue) {
                            // tslint:disable-next-line:max-line-length
                            const result = await Editor.Ipc.requestToPackage('asset-db', 'save-asset-meta', ...test.args);
                            expect(result).to.be.true;

                            const content = readFileSync(filePath, 'utf8');
                            const meta = JSON.parse(content);
                            expect(meta.userData.fileUrl).to.be.equal(fileUrl);
                        }

                        resolve();
                    }

                    await start();
                });
            });

            it('测试后清理', async () => {
                const result = await Editor.Ipc.requestToPackage('asset-db', 'delete-asset', fileUrl);
                expect(result).to.be.true;
            });

        });

    });

});
