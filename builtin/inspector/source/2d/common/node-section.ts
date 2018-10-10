'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

const { getType, getOptions, T } = require('../../utils');

const customDrawItems = ['cc.Sprite', 'cc.Button'];

const defaultOmitKey = ['uuid', 'name', 'active', 'children', 'parent', '__comps__'];

const compOmitKey = ['enabled', 'enabledInHierarchy', 'node'];

export const template = readFileSync(join(__dirname, '../../../static/2d/common/node-section.html'), 'utf8');

export const props: string[] = ['target'];

export function data() {
    return {
        groupList: ['test1', 'test2']
    };
}

export const methods = {
    getType,
    getOptions,
    T,

    /**
     * 打开群组设置
     */
    openGroupSetting() {
        // todo
    }
};
