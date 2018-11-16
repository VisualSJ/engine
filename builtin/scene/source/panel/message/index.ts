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

export function init(element: any) {
    broadcastInit(element);
    operationInit(element);
    queryInit(element);
}

export function apply() {
    const messages: any = {};
    broadcastApply(messages);
    operationApply(messages);
    queryApply(messages);
    return messages;
}
