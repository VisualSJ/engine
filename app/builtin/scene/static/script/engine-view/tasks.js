'use stirct';

const profile = Editor.Profile.load('profile://local/packages/scene.json');

exports.$scene = null;

/**
 * 编辑器是否就绪
 */
exports.editorInit = [
    'editor-init',
    {
        depends: [],
        async handle() {},
    },
];

/**
 * Asset DB 准备就绪
 */
exports.assetDbReady = [
    'asset-db-ready',
    {
        depends: [],
        async handle() {
            return await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
        },
    },
];

/**
 * 是否已经查询到了引擎的信息
 */
exports.queryEngineInfo = [
    'query-engine-info',
    {
        depends: [],
        async handle() {
            return await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        },
    },
];

/**
 * 场景运行的 webview 已经准备就绪
 */
exports.webviewReady = [
    'webview-ready',
    {
        depends: [],
        async handle() {
            exports.$scene.depend.finish('webview-ready');
        },
        async reset() {
            Editor.Ipc.sendToAll('scene:close');
        },
    },
];

/**
 * 场景内的引擎初始化完成
 */
exports.webviewEngineInit = [
    'webview-engine-init',
    {
        depends: ['asset-db-ready', 'query-engine-info', 'webview-ready'],
        async handle() {
            try {
                await exports.$scene.ipc.forceSend('call-method', {
                    module: 'Startup',
                    handler: 'engine',
                    params: [exports.$scene.info],
                });
            } catch (error) {
                console.error(error);
            }
            exports.$scene.depend.finish('webview-engine-init');
        },
    },
];

/**
 * 场景内的各个管理器初始化完成
 */
exports.webviewManagerInit = [
    'webview-manager-init',
    {
        depends: ['asset-db-ready', 'query-engine-info', 'webview-engine-init'],
        async handle() {
            try {
                await exports.$scene.ipc.forceSend('call-method', {
                    module: 'Startup',
                    handler: 'manager',
                    params: [Object.assign(exports.$scene.info, {project: Editor.App.project})],
                });
            } catch (error) {
                console.error(error);
            }
            exports.$scene.depend.finish('webview-manager-init');
        },
    },
];

/**
 * 场景内的 ipc 队列机制初始化完成
 */
exports.webviewIpcReady = [
    'webview-ipc-ready',
    {
        depends: ['webview-manager-init'],
        async handle() {
            if (exports.$scene.ipc.isReady) {
                return;
            }
            exports.$scene.ipc.isReady = true;
            exports.$scene.ipc.step();
        },
        async reset() {
            exports.$scene.ipc.isReady = false;
        },
    },
];

/**
 * 是否已经自动打开过场景
 */
exports.autoOpenScene = [
    'auto-open-scene',
    {
        depends: ['editor-init', 'webview-manager-init'],
        async handle() {
            const uuid = profile.get('current-scene');
            await exports.$scene.forwarding('Scene', 'open', [uuid]);
            exports.$scene.depend.finish('auto-open-scene');
        },
    },
];
