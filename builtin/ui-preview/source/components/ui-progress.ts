'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/components/ui-progress.html'), 'utf8');
export function data() {
    return {
        testValue1: 20,
        testValue2: 20,
    };
}

export const methods = {
    ctlValue(name: string, method: any) {
        if (method === 'add') {
            // @ts-ignore
            this[name] += 8;
        } else {
            // @ts-ignore
            this[name] -= 8;
        }
    },
};
