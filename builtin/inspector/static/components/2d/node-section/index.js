'use strict';

const { readTemplate, readComponent } = require('../../../utils');

exports.template = readTemplate('2d', './node-section/index.html');

exports.props = ['uuid'];

exports.components = {
    'node-props': readComponent(__dirname, './node-props'),
    'node-comp': readComponent(__dirname, './node-comp')
};

exports.data = function() {
    return {
        node: null
    };
};

exports.watch = {
    uuid() {
        this.refresh();
    }
};

exports.methods = {
    /**
     * 刷新节点
     */
    async refresh() {
        // todo diff
        const dump = await Editor.Ipc.requestToPackage('scene', 'query-node', this.uuid);

        Object.keys(dump).forEach((key) => {
            if (key[0] === '_') {
                return;
            }

            dump[key].path = key;
        });

        dump.__comps__.forEach((comp, index) => {
            Object.keys(comp.value).forEach((key) => {
                comp.value[key].path = `__comps__.${index}.${key}`;
            });
        });

        this.node = dump;
    },

    /**
     * 节点数据被修改
     * @param {*} event
     */
    onPropertyChanged(event) {
        const dump = event.target.__vue__.dump;

        Editor.Ipc.sendToPanel('scene', 'set-property', {
            uuid: this.uuid,
            path: dump.path,
            dump: {
                type: dump.type,
                value: JSON.parse(JSON.stringify(dump.value))
            }
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
    }
};

exports.mounted = async function() {
    this.refresh();
};
