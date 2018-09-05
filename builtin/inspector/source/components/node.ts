'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(
    join(__dirname, '../../static/template/node.html'),
    'utf8'
);

export const props: string[] = ['node', 'onNodePropertyChange'];

export const components = {
    comp: require('./comp'),
    'my-prop': require('./prop')
};

export function data() {
    return {};
}

export const methods = {};
