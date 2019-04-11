'use strict';

const { basename } = require('path');
const vStacks = require('v-stacks');

/**
 * engine-view 监听的 ipc 消息
 */

const profile = Editor.Profile.load('profile://local/packages/scene.json');

let titleFlag_sceneSaved = null; // 当前 title 是否需要变动，此 flag 是为了减少性能开销，并不是场景是否已保存的准确状态

const messages = {

    ready() {
        this.depend.execute('webview-ready');
    },

    close() {
        this.depend.reset('webview-ready');
    },

    //////////////////////
    // 查询消息

    /**
     * 查询编辑器当前使用的引擎信息
     * scene 进程启动或者刷新的时候需要根据数据初始化引擎
     */
    'query-engine'() {
        return {
            // 引擎的路径
            path: this.info.path,
            // 引擎对应的 utils 位置
            utils: this.info.utils,
            // 是否需要编译
            compile: this.info.compile,
        };
    },

    /**
     * 查询当前启动的场景 uuid
     * scene 进程内如果刷新，需要重起场景
     *
     * todo 应该保留已修改的数据，执行软刷新
     */
    async 'query-scene'() {
        return profile.get('current-scene') || '';
    },

    /**
     * 打开场景成功后，记录当前打开的场景
     * @param {*} uuid
     */
    async 'set-scene'(uuid) {
        profile.set('current-scene', uuid || '');
        profile.save();

        await messages['change-title'](uuid ? true : false);
    },

    /**
     * 更新编辑器 title
     * @param {boolean} saved 是否已保存
     */
    async 'change-title'(saved) {
        if (saved === titleFlag_sceneSaved) {
            return saved; // 状态没变不做处理，减少性能开销
        }

        // 切换状态
        titleFlag_sceneSaved = saved;

        const uuid = profile.get('current-scene');

        let title = 'Editor 3D - ' + basename(Editor.App.project) + ' - ';

        if (uuid) {
            const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
            if (asset && asset.source) {
                title += asset.source;
            } else {
                title += 'Untitled';
            }
        } else {
            title += 'Untitled';
        }

        if (saved !== true) {
            title += '*';
        }

        Editor.Ipc.sendToAll('notice:editor-title-change', title);
    },

    /**
     * 查询 assetDB 内所有可以使用的脚本文件
     * scene 进程在启动场景之后，需要主动管理所有的脚本
     */
    async 'query-scripts'() {
        // 加载项目脚本
        const scripts = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', { type: 'scripts' });
        return scripts;
    },

    async 'query-effects'() {
        // 查询所有 *.effect
        const assets = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        const effects = assets
            .map((asset) => {
                if (asset.importer === 'effect') {
                    return asset.uuid;
                }
            })
            .filter(Boolean);

        return effects;
    },

    /**
     * 查询一个资源的信息
     * scene 场景加载资源的时候需要使用
     * @param {*} uuid
     */
    async 'query-asset-info'(uuid) {
        return Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    },

    /**
     * 通过 uuid 查询 meta 信息
     * 场景加载脚本判断是否为插件时需要使用
     * @param {string} uuid
     */
    async 'query-asset-meta'(uuid) {
        return Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', uuid);
    },

    /**
     * 通过路径查询资源 uuid
     * @param {string} url
     */
    async 'query-asset-uuid'(url) {
        return Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', url);
    },

    /**
     * 查询所有资源信息
     * @param {Object} options
     */
    async 'query-assets'(options) {
        return Editor.Ipc.requestToPackage('asset-db', 'query-assets', options);
    },

    //////////////////////
    // 转发消息

    /**
     * 广播消息给所有插件
     * @param  {...any} args
     */
    broadcast(...args) {
        Editor.Ipc.sendToAll(...args);
    },

    /**
     * scene 进程内需要打印 log
     * @param {*} type
     * @param  {...any} args
     */
    console(type, error) {
        error.stacks = ['at <process:scene>'];
        console[type](vStacks.decode(error, type));
    },

    /**
     * 选中节点
     * @param {*} uuids
     */
    'select-nodes'(uuids) {
        uuids.forEach((uuid) => {
            Editor.Selection.select('node', uuid);
        });
    },

    /**
     * 取消选中节点
     * @param {*} uuids
     */
    'unselect-nodes'(uuids) {
        uuids.forEach((uuid) => {
            Editor.Selection.unselect('node', uuid);
        });
    },

    /**
     * 是否锁定鼠标
     * @param {*} bool
     */
    'lock-pointer'(bool) {
        if (bool) {
            this.requestPointerLock();
        } else {
            document.exitPointerLock();
        }
    },

    /**
     * 更改鼠标样式
     * @param {*} type
     */
    'change-pointer'(type) {
        document.body.style.cursor = type;
    },

    /**
     * 保存资源
     * @param {*} uuid
     * @param {*} content
     */
    async 'save-asset'(uuid, content) {
        const saved = await Editor.Ipc.requestToPackage('asset-db', 'save-asset', uuid, content);

        if (saved === true) {
            await messages['change-title'](saved);
        }

        return saved;
    },

    /**
     * 创建一个新资源
     * @param {*} url
     * @param {*} content
     */
    'create-asset'(url, content) {
        return Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, content);
    },

    /**
     * 展示小窗口
     * 例如：粒子控制窗口
     * @param {*} info
     */
    'show-min-window'(info) {
        this.showMinWindow(info);
    },

    /**
     * 隐藏小窗口
     */
    'hide-min-window'() {
        this.hideMinWindow();
    },

    /**
     * 弹出选择是否保存的弹窗
     */
    'dirty-dialog'(name) {
        return Editor.Dialog.show({
            title: Editor.I18n.t('scene.messages.waning'),
            message: (name || 'Scene') + Editor.I18n.t('scene.messages.scenario_modified'),
            detail: Editor.I18n.t('scene.messages.want_to_save'),
            type: 'warning',

            default: 0,
            cancel: 2,

            buttons: [
                Editor.I18n.t('scene.messages.save'), // 0
                Editor.I18n.t('scene.messages.dont_save'), // 1
                Editor.I18n.t('scene.messages.cancel'), // 2
            ],
        });
    },

    'generate-available-url'(url) {
        return Editor.Ipc.requestToPackage(
            'asset-db',
            'generate-available-url',
            url
        );
    },

    /**
     * 调出面板上对应的 toolbar 元素
     */
    toolbar(mode) {
        this.$toolbar.setAttribute('mode', mode ? mode : '');
    },
};

module.exports = function(elem) {
    Object.keys(messages).forEach((name) => {
        elem.ipc.on(name, messages[name].bind(elem));
    });
};
