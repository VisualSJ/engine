'use strict';
const { basename, extname } = require('path');
const {
    readTemplate,
    readComponent,
    T,
    build2DProp
} = require('../../../utils');

exports.template = readTemplate('2d', './node-section/index.html');

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
        try {
            this.$root.toggleLoading(true);
            const dump = await Editor.Ipc.requestToPackage(
                'scene',
                'query-node',
                this.uuid
            );
            if (dump) {
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
                            build2DProp(path, key, item, attrs);
                        } else {
                            delete comp.value[key];
                        }
                    });
                });
            }

            this.node = dump;
        } catch (err) {
            console.error(err);
            this.node = null;
        } finally {
            this.$root.toggleLoading(false);
        }
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
                    label: T('component', 'collider'),
                    submenu: [
                        {
                            label: 'Box Collider',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.BoxCollider'
                            }
                        },
                        {
                            label: 'Circle Collider',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.CircleCollider'
                            }
                        },
                        {
                            label: 'Polygon Collider',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.PolygonCollider'
                            }
                        }
                    ]
                },
                {
                    label: T('component', 'others'),
                    submenu: [
                        {
                            label: 'Animation',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.Animation'
                            }
                        },
                        {
                            label: 'AudioSource',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.AudioSource'
                            }
                        },
                        {
                            label: 'Camera',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Camera' }
                        },
                        {
                            label: 'MotionStreak',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.MotionStreak'
                            }
                        }
                    ]
                },

                {
                    label: T('component', 'physics'),
                    submenu: [
                        {
                            label: 'Collider',
                            submenu: [
                                {
                                    label: 'Box',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component:
                                            'cc.PhysicsBoxCollider'
                                    }
                                },
                                {
                                    label: 'Chain',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component:
                                            'cc.PhysicsChainCollider'
                                    }
                                },
                                {
                                    label: 'Circle',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component:
                                            'cc.PhysicsCircleCollider'
                                    }
                                },
                                {
                                    label: 'Polygon',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component:
                                            'cc.PhysicsPolygonCollider'
                                    }
                                }
                            ]
                        },
                        {
                            label: 'Joint',
                            submenu: [
                                {
                                    label: 'Distance',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.DistanceJoint'
                                    }
                                },
                                {
                                    label: 'Motor',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.MotorJoint'
                                    }
                                },
                                {
                                    label: 'Mouse',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.MouseJoint'
                                    }
                                },
                                {
                                    label: 'Prismatic',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.PrismaticJoint'
                                    }
                                },
                                {
                                    label: 'Revolute',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.RevoluteJoint'
                                    }
                                },
                                {
                                    label: 'Rope',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.RopeJoint'
                                    }
                                },
                                {
                                    label: 'Weld',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.WeldJoint'
                                    }
                                },
                                {
                                    label: 'Wheel',
                                    click() {
                                        Editor.Ipc.sendToPanel(
                                            'scene',
                                            'create-component',
                                            this.params
                                        );
                                    },
                                    params: {
                                        uuid,
                                        component: 'cc.WheelJoint'
                                    }
                                }
                            ]
                        },
                        {
                            label: 'Rigid Body',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.RigidBody'
                            }
                        }
                    ]
                },
                {
                    label: T('component', 'renderers'),
                    submenu: [
                        {
                            label: 'DragonBones',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.DragonBones'
                            }
                        },
                        {
                            label: 'Graphics',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Graphics' }
                        },
                        {
                            label: 'Label',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Label' }
                        },
                        {
                            label: 'LabelOutline',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.LabelOutline'
                            }
                        },
                        {
                            label: 'Mask',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Mask' }
                        },
                        {
                            label: 'ParticleSystem',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ParticleSystem'
                            }
                        },
                        {
                            label: 'RichText',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.RichText' }
                        },
                        {
                            label: 'Spine Skeleton',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.SpineSkeleton'
                            }
                        },
                        {
                            label: 'Sprite',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Sprite' }
                        },
                        {
                            label: 'SpriteDistortion',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.SpriteDistortion'
                            }
                        },
                        {
                            label: 'TiledMap',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.TiledMap' }
                        }
                    ]
                },
                {
                    label: T('component', 'scripts'),
                    submenu
                },
                {
                    label: T('component', 'ui'),
                    submenu: [
                        {
                            label: 'Block Input Events',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.BlockInputEvents'
                            }
                        },
                        {
                            label: 'Button',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Button' }
                        },
                        {
                            label: 'Canvas',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Canvas' }
                        },
                        {
                            label: 'EditBox',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.EditBox' }
                        },
                        {
                            label: 'Layout',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Layout' }
                        },
                        {
                            label: 'PageView',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.PageView' }
                        },
                        {
                            label: 'PageViewIndicator',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.PageViewIndicator'
                            }
                        },
                        {
                            label: 'ProgressBar',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ProgressBar'
                            }
                        },
                        {
                            label: 'ScrollBar',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ScrollBar'
                            }
                        },
                        {
                            label: 'ScrollView',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ScrollView'
                            }
                        },
                        {
                            label: 'Slider',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Slider' }
                        },
                        {
                            label: 'Toggle',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Toggle' }
                        },
                        {
                            label: 'ToggleContainer',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ToggleContainer'
                            }
                        },
                        {
                            label: 'ToggleGroup (Legacy)',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.ToggleGroup'
                            }
                        },
                        {
                            label: 'VideoPlayer',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: {
                                uuid,
                                component: 'cc.VideoPlayer'
                            }
                        },
                        {
                            label: 'WebView',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.WebView' }
                        },
                        {
                            label: 'Widget',
                            click() {
                                Editor.Ipc.sendToPanel(
                                    'scene',
                                    'create-component',
                                    this.params
                                );
                            },
                            params: { uuid, component: 'cc.Widget' }
                        }
                    ]
                }
            ]
        });
    }
};

exports.mounted = async function() {
    this.refresh();
};
