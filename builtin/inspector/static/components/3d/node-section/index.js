'use strict';

const { basename, extname } = require('path');
const {
    readTemplate,
    readComponent,
    T,
    build3DProp
} = require('../../../utils');

exports.template = readTemplate('3d', './node-section/index.html');

exports.props = ['uuid'];

exports.components = {
    'node-props': readComponent(__dirname, './node-props'),
    'node-comp': readComponent(__dirname, './node-comp')
};

exports.data = function() {
    return {
        node: null,
        userScripts: null
    };
};

exports.watch = {
    uuid() {
        this.refresh();
    }
};

exports.created = async function() {
    try {
        const userScripts = await Editor.Ipc.requestToPackage(
            'asset-db',
            'query-assets'
        );
        this.userScripts = userScripts.filter((item) =>
            item.importer.includes('javascript')
        );
    } catch (err) {
        console.error(err);
        this.userScripts = [];
    }
};

exports.methods = {
    T,

    /**
     * 刷新节点
     */
    async refresh() {
        // todo diff
        const dump = await Editor.Ipc.requestToPackage(
            'scene',
            'query-node',
            this.uuid
        );

        Object.keys(dump).forEach((key) => {
            if (key[0] === '_') {
                return;
            }

            dump[key].path = key;
        });

        dump.__comps__.forEach((comp, index) => {
            Object.keys(comp.value).forEach((key) => {
                const path = `__comps__.${index}.${key}`;
                const item = comp.value[key];
                const attrs = comp.properties[key];
                if (attrs && item) {
                    build3DProp(path, key, item, attrs);
                    for (let key in attrs) {
                        if (key in item) {
                            continue;
                        }
                        item[key] = attrs[key];
                    }
                } else {
                    delete comp.value[key];
                }
            });
        });

        this.node = dump;
    },

    /**
     * 节点数据被修改
     * @param {*} event
     * @param {*} dump
     */
    onPropertyChanged(event) {
        const dump = event.detail
            ? event.detail.dump
            : event.target.__vue__.dump;

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

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
            node: {
                uuid: { value: uuid }
            },
            userScripts
        } = this;
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);
        const submenu = userScripts.map((item) => {
            const { source, uuid: component } = item;
            const label = basename(source, extname(source));
            return {
                label,
                click() {
                    Editor.Ipc.sendToPanel(
                        'scene',
                        'create-component',
                        this.params
                    );
                },
                params: { uuid, component }
            };
        });

        Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: T('component', 'components'),
                    submenu: [
                        {
                            label: 'Animation Component',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.AnimationComponent'
                            }
                        },
                        {
                            label: 'Camera Component',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.CameraComponent'
                            }
                        },
                        {
                            label: 'Light Component',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.LightComponent'
                            }
                        },
                        {
                            label: 'Model Component',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ModelComponent'
                            }
                        },
                        {
                            label: 'Skinning Model Component',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.SkinningModelComponent'
                            }
                        },
                        {
                            label: 'Skybox Component',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.SkyboxComponent'
                            }
                        }
                    ]
                },
                {
                    label: T('component', 'others'),
                    submenu: []
                },

                {
                    label: T('component', 'scripts'),
                    submenu
                },
                {
                    label: T('component', 'ui'),
                    submenu: []
                }
            ]
        });
    }
};

exports.mounted = async function() {
    this.refresh();
};
