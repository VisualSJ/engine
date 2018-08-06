'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/node.html'), 'utf8');

export const props: string[] = [
    'node',
];

export const components = {
    comp: require('./comp'),
};

export function data () {
    return {};
};

export const methods = {
    
};