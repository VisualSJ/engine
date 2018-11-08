'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate(
    '2d',
    './node-section/comps/mask.html'
);

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
        const path = this.target.name.path.replace('name', '');
        const dump = {
            path: `${path}_resizeToTarget`,
            type: 'Boolean',
            value: true
        };
        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump
            }
        });

        this.$el.dispatchEvent(customEvent);
    }
};
