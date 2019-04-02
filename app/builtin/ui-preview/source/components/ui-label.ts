'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/components/ui-label.html'), 'utf8');
export function data() {
    return {};
}

export const methods = {

};

export async function beforeClose() { }

export async function close() { }
