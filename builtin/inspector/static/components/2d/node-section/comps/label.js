'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/label.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    isBMFont() {
        return this.target._bmFontOriginalSize.value > 0;
    },

    isSystemFont() {
        return this.target.useSystemFont.value;
    },

    hiddenWrapText() {
        let overflow = String(this.target.overflow.value);
        return ['0', '3'].includes(overflow);
    },

    hiddenActualFontSize() {
        let overflow = String(this.target.overflow.value);
        return !['2'].includes(overflow);
    }
};
