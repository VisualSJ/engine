'use strict';

const fs = require('fs');
const ps = require('path');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/header.html'), 'utf-8');

exports.props = [
    'tab',
    'tabs',
];

exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * tab 切换
     * @param {*} event
     * @param {*} index
     */
    _onTabClick(event, index) {
        this.$root.$emit('change-tab', index);
    },
};

exports.ready = function() {};
