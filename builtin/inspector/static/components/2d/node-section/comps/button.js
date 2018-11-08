'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate(
    '2d',
    './node-section/comps/button.html'
);

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    resetNodeSize() {
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
    },

    autoGrayEffectEnabled() {
        // todo
        const { transition, disabledSprite } = this.target;
        if (
            ['2'].includes(String(transition.value)) &&
            disabledSprite.value.uuid
        ) {
            return false;
        }
        return true;
    },

    checkResizeToTarget(target, multi) {
        // todo
        if (multi) {
            // todo
            return true;
        }
        return !target.value.uuid;
    },

    checkTransition(transition, num, multi) {
        if (multi) {
            // todo
        }
        return +transition.value === num;
    }
};
