'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const typeToComponent: any = {
    '*': 'default-type',
    image: 'sprite-frame'
};

export const template = readFileSync(join(__dirname, '../../static/template/asset.html'), 'utf8');

export const props: string[] = ['meta', 'onMetaChange'];

export function data() {
    return {};
}

export const components = {
    'sprite-frame': require('./asset-types/sprite-frame'),
    'default-type': require('./asset-types/default-type')
};

export const computed = {
    /**
     * 根据 importer 类型返回对应的组件
     * @param {*} this
     * @returns
     */
    currentAssetType(this: any) {
        if (this.meta && this.meta.importer) {
            return typeToComponent[this.meta.importer];
        }
        return 'default-type';
    }
};

export const methods = {};
