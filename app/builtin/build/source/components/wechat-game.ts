'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
const {mixinBase} = require('./../utils');
const template = readFileSync(join(__dirname, '../../static/template/components/wechat-game.html'), 'utf8');
function data() {
    return {
        appid: '',
        remote_server_address: '',
        sub_context: '',
        orientation: 'landscape',
    };
}

const methods = {};

module.exports = {
    template,
    methods,
    data,
    mixins: [mixinBase],
};
