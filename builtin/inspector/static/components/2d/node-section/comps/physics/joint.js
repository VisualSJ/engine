'use strict';

const { readTemplate, T, getComponentType } = require('../../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/physics/joint.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,
    getComponentType,

    lastRigidBody() {
        // todo
    },

    nextRigidBody() {
        // todo
    }
};
