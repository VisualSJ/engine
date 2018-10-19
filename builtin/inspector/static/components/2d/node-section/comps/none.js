'use strict';

const { readTemplate } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/none.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * 将 type 转成 component 名字
     * @param {*} type
     */
    getComponent(type) {
        if (!type) {
            return false;
        }

        type = type.toLocaleLowerCase();
        type = type.replace(/\./, '-');

        return this.$options.components[type] ? type : false;
    }
};

exports.mounted = async function() {};
