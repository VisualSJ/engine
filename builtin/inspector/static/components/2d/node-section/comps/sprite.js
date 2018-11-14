'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate(
    '2d',
    './node-section/comps/sprite.html'
);

exports.props = ['target'];

exports.data = function() {
    return {
        atlasUuid: '',
        atlasUuids: '',
        atlasMulti: false,

        spriteUuid: '',
        spriteUuids: '',
        spriteMulti: false
    };
};

exports.methods = {
    T,

    selectAtlas() {
        // todo
    },

    editSprite() {
        // todo
        const {
            spriteFrame: {
                value: { uuid }
            }
        } = this.target;

        Editor.Ipc.sendToPackage(
            'inspector',
            'open-sprite-editor',
            uuid
        );
    }
};
