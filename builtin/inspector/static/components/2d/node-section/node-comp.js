'use strict';

const { readTemplate, readComponent } = require('../../../utils');

exports.template = readTemplate('2d', './node-section/node-comp.html');

exports.props = ['uuid', 'index', 'total', 'comp'];

exports.components = {
    none: readComponent(__dirname, './comps/none'),
    'cc-button': readComponent(__dirname, './comps/button'),
    'cc-camera': readComponent(__dirname, './comps/camera'),
    'cc-blockinputevents': require('./comps/block-input-events'),
    'cc-editbox': readComponent(__dirname, './comps/editbox'),
    'cc-layout': readComponent(__dirname, './comps/layout'),
    'cc-pageview': readComponent(__dirname, './comps/pageview'),
    'cc-toggle': readComponent(__dirname, './comps/toggle'),
    'cc-videoplayer': readComponent(__dirname, './comps/videoplayer'),
    'cc-widget': readComponent(__dirname, './comps/widget'),

    'cc-pointsbasecollider': readComponent(__dirname, './comps/points-base-collider'),

    'cc-joint': readComponent(__dirname, './comps/physics/joint'),

    'cc-label': readComponent(__dirname, './comps/label'),
    'cc-mask': readComponent(__dirname, './comps/mask'),
    'cc-particlesystem': readComponent(__dirname, './comps/particle-system'),
    'cc-sprite': readComponent(__dirname, './comps/sprite')
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
        if (isBaseCollider(type)) {
            return 'cc-pointsbasecollider';
        }
        if (checkIsJoint(type)) {
            return 'cc-joint';
        }

        type = type.toLocaleLowerCase();
        type = type.replace(/\./, '-');
        if (!exports.components[type]) {
            return 'none';
        }
        return type;
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

function isBaseCollider(type) {
    return ['cc.PhysicsChainCollider', 'cc.PhysicsPolygonCollider', 'cc.PolygonCollider'].includes(type);
}

function checkIsJoint(type) {
    return [
        'cc.DistanceJoint',
        'cc.MotorJoint',
        'cc.MouseJoint',
        'cc.PrismaticJoint',
        'cc.RevoluteJoint',
        'cc.RopeJoint',
        'cc.WeldJoint',
        'cc.WheelJoint'
    ].includes(type);
}
