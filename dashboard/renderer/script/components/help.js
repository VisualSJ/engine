'use strict';

const fs = require('fs');
const ps = require('path');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/help.html'), 'utf-8');

exports.props = [
    'type',
];

exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * 跳转到某个页面
     */
    _onJumpClick(event, index) {
        this.$root.$emit('change-tab', index);
    },
};

exports.ready = function() {};
