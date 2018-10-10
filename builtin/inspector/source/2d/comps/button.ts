'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

const { getOptions, getType, T } = require('../../utils');

export const template = readFileSync(join(__dirname, '../../../static/2d/comps/button.html'), 'utf8');

export const props: string[] = ['target'];

export const components = {
    'array-prop': require('../common/array-prop')
};

export function data() {
    return {};
}

export const methods = {
    getOptions,
    getType,
    T,
    resetNodeSize() {
        // todo
    },
    autoGrayEffectEnabled() {
        // todo
    },
    checkResizeToTarget(target: any) {
        // todo
    },
    checkTransition(transition: any, num: number) {
        return transition.value === num;
    }
};
