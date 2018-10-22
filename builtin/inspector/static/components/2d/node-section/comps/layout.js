'use strict';

const { readTemplate, readComponent, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/layout.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    isPaddingEnabled() {
        const { type, resizeMode } = this.target;

        return (+type.value === 0 && +resizeMode.value === 1) || +type.value !== 0;
    },

    isPaddingHorizontalEnabled() {
        return +this.target.type.value !== 2;
    },

    isPaddingVerticalEnabled() {
        return +this.target.type.value !== 1;
    },

    isAllowHorizontalLayout() {
        const { type } = this.target;

        return [1, 3].includes(+type.value);
    },

    isAllowVerticalLayout() {
        const { type } = this.target;

        return [2, 3].includes(+type.value);
    },

    isGridLayout() {
        return +this.target.type.value === 3;
    },

    isShowCellSize() {
        const { type, resizeMode } = this.target;

        return +type.value === 3 && +resizeMode.value === 2;
    }
};
