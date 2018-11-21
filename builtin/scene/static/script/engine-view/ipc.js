'use strict';

/**
 * engine-view 监听的 ipc 消息
 */

const profile = Editor.Profile.load('profile://local/packages/scene.json');

const messages = {
    //////////////////////
    // 查询消息

    /**
     * 查询编辑器当前使用的引擎信息
     * scene 进程启动或者刷新的时候需要根据数据初始化引擎
     */
    'query-engine'() {
        return {
            path: this.info.path,
            utils: this.info.utils,
            compile: this.info.compile,
        };
    },

    /**
     * 查询当前启动的场景 uuid
     * scene 进程内如果刷新，需要重起场景
     *
     * todo 应该保留已修改的数据，执行软刷新
     */
    'query-scene'() {
        return profile.get('current-scene') || '';
    },
    /**
     * 查询 assetDB 内所有可以使用的脚本文件
     * scene 进程在启动场景之后，需要主动管理所有的脚本
     */
    async 'query-scripts'() {
        // 加载项目脚本
        const assets = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        const scripts = assets
            .map((asset) => {
                if (asset.importer === 'javascript') {
                    return asset.uuid;
                }
            })
            .filter(Boolean);

        return scripts;
    },

    /**
     * 查询一个资源的信息
     * scene 场景加载资源的时候需要使用
     * @param {*} uuid
     */
    async 'query-asset-info'(uuid) {
        return Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
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
    console(type, ...args) {
        console[type](...args);
    },

    /**
     * 选中节点
     * @param {*} uuids
     */
    'select-nodes'(uuids) {
        uuids.forEach((uuid) => {
            Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
        });
    },

    /**
     * 取消选中节点
     * @param {*} uuids
     */
    'unselect-nodes'(uuids) {
        uuids.forEach((uuid) => {
            Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
        });
    },

    'lock-pointer'(bool) {
        if (bool) {
            this.requestPointerLock();
        } else {
            document.exitPointerLock();
        }
    },
};

module.exports = function(elem) {
    Object.keys(messages).forEach((name) => {
        elem.ipc.on(name, messages[name].bind(elem));
    });
};
