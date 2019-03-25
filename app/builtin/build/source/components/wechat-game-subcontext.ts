'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
const {mixinBase} = require('./../utils');
const template = readFileSync(join(__dirname, '../../static/template/components/wechat-game-subcontext.html'), 'utf8');
function data() {
    return {
        orientation: 'auto',
    };
}

module.exports = {
    template,
    data,
    mixins: [mixinBase],
};
