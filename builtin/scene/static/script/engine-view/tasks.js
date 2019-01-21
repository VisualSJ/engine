'use stirct';

const profile = Editor.Profile.load('profile://local/packages/scene.json');

exports.$scene = null;

exports.assetDbReady = [
    'asset-db-ready',
    {
        depends: [],
        async handle() {
            return await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
        },
    },
];

exports.queryEngineInfo = [
    'query-engine-info',
    {
        depends: [],
        async handle() {
            return await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        },
    },
];

exports.webviewReady = [
    'webview-ready',
    {
        depends: [],
        async handle() {},
        async reset() {
            Editor.Ipc.sendToAll('scene:close');
        },
    },
];

exports.webviewEngineInit = [
    'webview-engine-init',
    {
        depends: ['asset-db-ready', 'query-engine-info', 'webview-ready'],
        async handle() {
            await exports.$scene.ipc.forceSend('call-method', {
                module: 'Startup',
                handler: 'engine',
                params: [exports.$scene.info],
            });
            exports.$scene.depend.finish('webview-engine-init');
        },
    },
];

exports.webviewManagerInit = [
    'webview-manager-init',
    {
        depends: ['asset-db-ready', 'query-engine-info', 'webview-engine-init'],
        async handle() {
            await exports.$scene.ipc.forceSend('call-method', {
                module: 'Startup',
                handler: 'manager',
                params: [exports.$scene.info],
            });
            exports.$scene.depend.finish('webview-manager-init');
        },
    },
];

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

exports.autoOpenScene = [
    'auto-open-scene',
    {
        depends: ['webview-manager-init'],
        async handle() {
            const uuid = profile.get('current-scene');
            await exports.$scene.forwarding('Scene', 'open', [uuid]);
            exports.$scene.depend.finish('auto-open-scene');
        },
    },
];
