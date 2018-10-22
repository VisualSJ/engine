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
        let overflow = this.target.overflow.value;
        return overflow === 0 || overflow === 3;
    },

    hiddenActualFontSize() {
        let overflow = this.target.overflow.value;
        return overflow !== 2;
    }
};
