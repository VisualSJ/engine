'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/2d/asset.html'), 'utf8');

export const props: string[] = ['meta', 'onMetaChange'];

const importer2component: any = {
    '*': 'default-type',
    'sprite-frame': 'sprite-frame',
    texture: 'texture'
};

export function data() {
    return {};
}

export const components = {
    'sprite-frame': require('./asset-types/sprite-frame'),
    texture: require('./asset-types/texture'),
    'default-type': require('./asset-types/default-type')
};

export const computed = {
    /**
     * 根据 importer 类型返回对应的组件
     * @param {*} this
     * @returns
     */
    currentAssetType(this: any) {
        const importer = this.meta && this.meta.__assetType__;
        if (importer && importer2component[importer]) {
            return importer2component[importer];
        }
        return 'default-type';
    }
};

export const methods = {};
