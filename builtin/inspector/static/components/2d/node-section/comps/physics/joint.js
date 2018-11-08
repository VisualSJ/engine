'use strict';

const { readTemplate, T } = require('../../../../../utils');

exports.template = readTemplate(
    '2d',
    './node-section/comps/physics/joint.html'
);

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    prevRigidBody() {
        // todo
        const {
            node: {
                value: { uuid }
            }
        } = this.target;
        const { index } = this.$parent;

        Editor.Ipc.sendToPanel('scene', 'choose-rigid-body', {
            uuid,
            index,
            position: 'prev'
        });
    },

    nextRigidBody() {
        // todo
        const {
            node: {
                value: { uuid }
            }
        } = this.target;
        const { index } = this.$parent;

        Editor.Ipc.sendToPanel('scene', 'choose-rigid-body', {
            uuid,
            index,
            position: 'next'
        });
    }
};
