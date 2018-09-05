'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import { Focusable } from './focusable';

window.customElements.define('ui-focusable', Focusable);

export const template = readFileSync(
    join(__dirname, '../../static/template/prop.html'),
    'utf8'
);

export const props: string[] = [
    'indent',
    'movable',
    'removable',
    'foldable',
    'label'
];

export function data() {
    return {
        baseIndentSize: 13,
        hovering: false,
        selected: false
    };
}

export const methods = <any>{
    /**
     * 鼠标移入
     */
    onMouseOver() {
        this.hovering = true;
    },
    /**
     * 鼠标移出
     */
    onMouseOut() {
        this.hovering = false;
    }
};
