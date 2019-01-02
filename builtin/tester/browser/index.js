'use strict';

const packageManager = require('@editor/package');

exports.messages = {
    /**
     * 打开面板
     */
    open() {
        Editor.Panel.open('tester');
    },

    /**
     * 查询所有的插件列表
     */
    'query-package-list'() {
        const list = Editor.Package.getPackages({enable: true});
        return list.map((pkg) => {
            return {
                name: pkg.info.name,
                path: pkg.path,
            };
        });
    },

    /**
     * 传入插件名字，返回当前插件 browser 监听的消息数组
     * @param {*} name
     */
    async 'query-package-message-list'(name) {
        const pkg = packageManager.find(name);
        return Object.keys(pkg.module.messages);
    },
};

exports.load = function load() {

};

exports.unload = function unload() {

};
