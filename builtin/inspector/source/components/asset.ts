'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/asset.html'), 'utf8');

export const props: string[] = [
    'info',
    'meta',
];

export function data() {
    return {};
}

export const methods = {

};
