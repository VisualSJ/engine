'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/camera.html');

exports.props = ['target'];

exports.data = function() {
    return {
        groupList: [],
        clearFlags: ['Color', 'Depth', 'Stencil']
    };
};

exports.methods = {
    T,

    onProfileChanged() {
        // todo groupList
    },

    getCullingMask(index) {
        // todo
    },

    cullingMaskChanged(event, index) {
        // todo
    },

    everythingMask() {
        // todo
    },

    everythingMaskChanged(event) {
        // todo
    },

    getClearFlags(index) {
        // todo
    },

    clearFlagsChanged(event, index) {
        // todo
    }
};
