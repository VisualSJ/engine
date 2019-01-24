'use strict';

import { readTemplate } from '../../../../utils';

export const template = readTemplate('inspector-3d/node/components/widget.html');

export const props = [
    'width',
    'height',

    'value',
];

export const components: any = {
    'ui-prop': require('../../../public/ui-prop'),
    'node-function': require('./node-function'),
};

export const methods = {

    getUnit(type: string) {
        // @ts-ignore
        const data: any = this.value.value;

        switch (type) {
            case 'top':
                return data.isAbsoluteTop.value ? 'px' : '%';
            case 'bottom':
                return data.isAbsoluteBottom.value ? 'px' : '%';
            case 'left':
                return data.isAbsoluteLeft.value ? 'px' : '%';
            case 'right':
                return data.isAbsoluteRight.value ? 'px' : '%';
            case 'horizontal':
                return data.isAbsoluteHorizontalCenter.value ? 'px' : '%';
            case 'vertical':
                return data.isAbsoluteVerticalCenter.value ? 'px' : '%';
        }
    },

    changeUnit(type: string) {
        // @ts-ignore
        const data: any = this.value.value;

        let dump = null;

        switch (type) {
            case 'top':
                data.isAbsoluteTop.value = !data.isAbsoluteTop.value;
                dump = data.isAbsoluteTop;
                break;
            case 'bottom':
                data.isAbsoluteBottom.value = !data.isAbsoluteBottom.value;
                dump = data.isAbsoluteBottom;
                break;
            case 'left':
                data.isAbsoluteLeft.value = !data.isAbsoluteLeft.value;
                dump = data.isAbsoluteLeft;
                break;
            case 'right':
                data.isAbsoluteRight.value = !data.isAbsoluteRight.value;
                dump = data.isAbsoluteRight;
                break;
            case 'horizontal':
                data.isAbsoluteHorizontalCenter.value = !data.isAbsoluteHorizontalCenter.value;
                dump = data.isAbsoluteHorizontalCenter;
                break;
            case 'vertical':
                data.isAbsoluteVerticalCenter.value = !data.isAbsoluteVerticalCenter.value;
                dump = data.isAbsoluteVerticalCenter;
                break;
        }

        // @ts-ignore
        this.$root.$emit('set-property', {
            path: dump.path,
            type: dump.type,
            value: dump.value,
        });
    },
};

export const watch = {
};

export function data() {
    return {};
}

export function mounted() {
}
