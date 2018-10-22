'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/mask.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    isRectType() {
        return +this.target.type.value === 0;
    },
    isEllipseType() {
        return +this.target.type.value === 1;
    },
    isImageStencilType() {
        return +this.target.type.value === 2;
    },
    onAppImageSizeClick() {
        // todo
    }
};
