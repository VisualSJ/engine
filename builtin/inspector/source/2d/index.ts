'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static', '/2d/index.html'), 'utf8');

export const props: string[] = ['node', 'type', 'onNodePropertyChange', 'meta', 'onMetaChange'];

export const components = {
    node: require('./node'),
    asset: require('./asset')
};

export function data() {
    return {};
}
