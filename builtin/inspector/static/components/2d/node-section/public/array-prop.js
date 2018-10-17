'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/public/array-prop.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,
    arraySizeChanged(event) {
        // todo
        // const { value } = event.detail;
        // if (value < this.target.value.length) {
        //     const arr = Array.from({ length: value });
        //     for (let i = 0; i < value; i++) {
        //         arr[i] = this.target.value[i];
        //     }
        //     this.target.value = arr;
        // } else {
        //     this.target.value.length = value;
        // }
    }
};
