'use strict';

const { readTemplate, readComponent } = require('../../../utils');

exports.template = readTemplate('2d', './node-section/node-comp.html');

exports.props = ['uuid', 'index', 'total', 'comp'];

exports.components = {
    none: readComponent(__dirname, './comps/none'),
    'cc-sprite': readComponent(__dirname, './comps/sprite'),
    'cc-button': readComponent(__dirname, './comps/button'),
    'cc-camera': readComponent(__dirname, './comps/camera'),
    'cc-blockinputevents': require('./comps/block-input-events'),
    'cc-editbox': readComponent(__dirname, './comps/editbox'),
    'cc-layout': readComponent(__dirname, './comps/layout'),
    'cc-pageview': readComponent(__dirname, './comps/pageview'),
    'cc-toggle': readComponent(__dirname, './comps/toggle'),
    'cc-videoplayer': readComponent(__dirname, './comps/videoplayer'),
    'cc-widget': readComponent(__dirname, './comps/widget'),

    'cc-polygoncollider': readComponent(__dirname, './comps/points-base-collider'),

    'cc-label': readComponent(__dirname, './comps/label'),
    'cc-mask': readComponent(__dirname, './comps/mask')
};

exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * 将 type 转成 component 名字
     * @param {*} type
     */
    getComponent(type) {
        type = type.toLocaleLowerCase();
        type = type.replace(/\./, '-');
        if (!exports.components[type]) {
            return 'none';
        }
        return type;
    },

    /**
     * 节点数据被修改
     * @param {*} event
     */
    onPropertyChanged(event) {
        // 获取属性的类型
        let type = '';
        event.path.some((item) => {
            if (item.tagName === 'UI-PROP') {
                type = item.type;
                return true;
            }
        });
        type = type === 'vec2' ? 'cc.Vec2' : type;
        type = type === 'vec3' ? 'cc.Vec3' : type;
        type = type === 'color' ? 'cc.Color' : type;
        type = type === 'node' ? 'cc.Node' : type;
        type = type === 'scene' ? 'cc.Scene' : type;
        type = type === 'asset' ? 'cc.Asset' : type;

        // 获取属性的搜索路径
        let path = '';
        event.path.forEach((item) => {
            if (item.path) {
                path = path ? `${item.path}.${path}` : item.path;
            }
        });

        let value = event.target.value;
        if (type === 'cc.Color') {
            value = { r: value[0], g: value[1], b: value[2], a: value[3] };
        } else if (type === 'cc.Asset') {
            value = { uuid: value };
        }

        Editor.Ipc.sendToPanel('scene', 'set-property', {
            path: `__comps__.${this.index}.${path}`,
            uuid: this.uuid,
            dump: { type, value }
        });
    },

    /**
     * 打开帮助页面
     * @param {*} event
     */
    onOpenHelpClick(event) {
        // todo
    },

    /**
     * 组件的菜单
     * @param {*} event
     */
    onContextMenuClick(event) {
        const { left, bottom } = event.target.getBoundingClientRect();
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        const uuid = this.uuid;
        const total = this.total;
        const index = this.index;

        return Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: 'Remove',
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'remove-array-element', {
                            uuid: uuid,
                            path: '__comps__',
                            index: index
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Move Up',
                    enabled: index !== 0,
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'move-array-element', {
                            uuid: uuid,
                            path: '__comps__',
                            target: index,
                            offset: -1
                        });
                    }
                },
                {
                    label: 'Move Down',
                    enabled: index !== total - 1,
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'move-array-element', {
                            uuid: uuid,
                            path: '__comps__',
                            target: index,
                            offset: 1
                        });
                    }
                }
            ]
        });
    }
};

exports.mounted = async function() {};
