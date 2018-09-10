'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../../static/template/meta-header.html'), 'utf8');

export const props: string[] = ['meta', 'icon'];

export const components = {
    'my-prop': require('../prop')
};

export function data() {
    return {
        cssHost: {
            display: 'flex',
            flex: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: '2px',
            borderBottom: '1px solid #666',
            height: '24px',
            overflow: 'hidden'
        },
        cssIcon: {
            marginRight: '5px'
        },
        cssTitle: {
            fontWeight: 'bold',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        }
    };
}

export const methods = {
    /**
     * 取消修改
     * @param {*} this
     */
    revert(this: any) {
        // todo
    },
    /**
     * 应用修改
     * @param {*} this
     */
    apply(this: any) {
        // todo
    }
};
