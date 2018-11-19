'use strict';

const fs = require('fs');
const ps = require('path');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/type.html'), 'utf-8');

exports.props = [
    'type',
    'types',
];

exports.data = function() {
    return {};
};

exports.methods = {

    /**
     * 切换类型
     * @param {*} event
     * @param {*} item
     */
    _onTabClick(event, item) {
        this.$root.$emit('change-type', item.type);
    },
};
exports.ready = function() {};
