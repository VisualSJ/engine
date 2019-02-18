'use strict';

const fs = require('fs');
const ps = require('path');
const {t} = require('./../util');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/help.html'), 'utf-8');

exports.props = [
    'type',
];

exports.data = function() {
    return {
        ver: '1.0.0',
    };
};

exports.methods = {
    t,
    /**
     * 跳转到某个页面
     */
    _onJumpClick(event, index) {
        this.$root.$emit('change-tab', index);
    },
};

exports.ready = function() {};
