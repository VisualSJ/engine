'use strict';

const { readdirSync } = require('fs');
const { join, basename, extname } = require('path');
const { readTemplate, T } = require('../../utils');

exports.template = readTemplate('2d', './node-section/public/array-prop.html');

exports.props = {
    dump: {
        type: Object,
        require: true
    },
    indent: {
        type: Number,
        default: 0
    }
};

exports.data = function() {
    return {
        foldUp: false,
        paddingStyle:
            this.indent !== 0
                ? {
                      'padding-left': `${this.indent * 13}px`
                  }
                : ''
    };
};

exports.components = readdirSync(join(__dirname, '../public')).reduce((prev, next) => {
    const key = basename(next, extname(next));
    prev[key] = require(join(__dirname, '../public', next));

    return prev;
}, {});

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
