'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../../../template', '/2d/node-section/index.html'), 'utf8');

exports.props = [
    'uuid',
];

exports.components = {
    'node-props': require('./node-props'),
    'node-comp': require('./node-comp'),
};

exports.data = function() {
    return {
        node: null,
    };
};

exports.watch = {
    uuid() {
        this.refresh();
    },
};

exports.methods = {

    /**
     * 刷新节点
     */
    async refresh() {
        // todo diff
        this.node = await Editor.Ipc.requestToPackage('scene', 'query-node', this.uuid);
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

        // 获取属性的搜索路径
        let path = '';
        event.path.forEach((item) => {
            if (item.path) {
                path = path ? `${item.path}.${path}` : item.path;
            }
        });

        if (!path) {
            return;
        }

        let value = event.target.value;
        if (type === 'cc.Color') {
            value = { r: value[0], g: value[1], b: value[2], a: value[3], };
        }

        Editor.Ipc.sendToPanel('scene', 'set-property', {
            path,
            uuid: this.uuid,
            dump: { type, value, },
        });
    },

    /**
     * 弹出添加组件菜单
     * @param {*} event
     */
    addCompPopup(event) {
        const { left, bottom } = event.target.getBoundingClientRect();
        const {
            uuid: { value: uuid }
        } = this.node;
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: 'Button',
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'create-component', this.params);
                    },
                    params: { uuid, component: 'cc.Button' }
                },
                {
                    label: 'Sprite',
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'create-component', this.params);
                    },
                    params: { uuid, component: 'cc.Sprite' }
                }
            ]
        });
    },
};

exports.mounted = async function() {
    this.refresh();
};
