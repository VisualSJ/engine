'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/comp.html'), 'utf8');

export const props: string[] = [
    'component',
];

export function data() {
    return {};
}

export const methods = {

};
