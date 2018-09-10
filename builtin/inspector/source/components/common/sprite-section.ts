'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../../static/template/sprite-section.html'), 'utf8');

export const props: string[] = ['meta'];

export const components = {
    'my-prop': require('../prop')
};

export function data() {
    return {};
}

export const methods = <any>{
    /**
     * 判断当前是否处于自定义剪切
     * @returns {boolean}
     */
    isCustom(): boolean {
        return this.meta.trimType === 'custom';
    },
    /**
     * 图片编辑
     */
    editSprite() {
        // todo
    }
};
