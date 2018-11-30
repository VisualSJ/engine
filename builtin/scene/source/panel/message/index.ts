'use stirct';

import {
    apply as broadcastApply,
    init as broadcastInit,
} from './broadcast';

import {
    apply as operationApply,
    init as operationInit,
} from './operation';

import {
    apply as queryApply,
    init as queryInit,
} from './query';

import {
    apply as prefabApply,
    init as prefabInit,
} from './prefab';

export function init(element: any) {
    broadcastInit(element);
    operationInit(element);
    queryInit(element);
    prefabInit(element);
}

export function apply() {
    const messages: any = {};
    broadcastApply(messages);
    operationApply(messages);
    queryApply(messages);
    prefabApply(messages);
    return messages;
}
