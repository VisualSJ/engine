'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/components/ui-drag.html'), 'utf8');

export function data() {
    return {};
}

export const methods = {
    onDragstart(event:Event) {
         // @ts-ignore
        event.dataTransfer.setData('value', event.target.type);
    },
    onDrag(event:Event) {
        console.log('drop');
    }
};