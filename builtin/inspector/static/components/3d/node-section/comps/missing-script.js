'use strict';

const { T } = require('../../../../utils');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {};

exports.render = function(h) {
    const { value: compiled } = this.target.compiled;
    const text = compiled ? T('missing_script', 'error_compiled') : T('missing_script', 'error_not_compiled');
    return h('div', { class: { 'missing-script-message': true } }, text);
};
