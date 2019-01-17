'use strict';

import { readTemplate, translationDump } from '../../../utils';

export const template = readTemplate('inspector-3d/node/comp.html');

export const props = [
    'width',
    'height',

    'index',
    'total',
    'uuid',
    'value',
];

export const components = {
    'ui-prop': require('../../public/ui-prop'),
};

export const methods = {
    /**
     *
     * @param event
     */
    _onClickComponentMenu(event: any) {
        const vm: any = this;

        const { left, bottom } = event.target.getBoundingClientRect();
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        const uuid = vm.uuid;
        const total = vm.total;
        const index = vm.index;

        Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: 'Remove',
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'remove-array-element', {
                            uuid,
                            path: '__comps__',
                            index,
                        });
                    },
                },
                { type: 'separator' },
                {
                    label: 'Move Up',
                    enabled: index !== 0,
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'move-array-element', {
                            uuid,
                            path: '__comps__',
                            target: index,
                            offset: -1,
                        });
                    },
                },
                {
                    label: 'Move Down',
                    enabled: index !== total - 1,
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'move-array-element', {
                            uuid,
                            path: '__comps__',
                            target: index,
                            offset: 1,
                        });
                    },
                },
            ],
        });
    },
};

export const watch = {
};

export function data() {
    return {

    };
}

export function mounted() {
}
