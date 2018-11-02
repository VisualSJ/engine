'use strict';

const { readTemplate, T } = require('../../utils');

exports.template = readTemplate('2d', './node-section/public/array-prop.html');

exports.props = ['dump'];

exports.data = function() {
    return {};
};

exports.components = {
    'event-prop': require('./event-prop')
};

exports.methods = {
    T,

    arraySizeChanged(event) {
        const { value } = event.target;
        if (value < this.dump.value.length) {
            const arr = Array.from({ length: value });
            for (let i = 0; i < value; i++) {
                arr[i] = this.dump.value[i];
            }
            this.dump.value = arr;
        } else {
            this.dump.value.length = value;
        }

        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump: {
                    type: 'Array',
                    path: `${this.dump.path}.length`,
                    value
                }
            }
        });

        this.$el.dispatchEvent(customEvent);

    }

};
