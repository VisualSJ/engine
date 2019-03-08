'use stirct';

import { readFileSync } from 'fs-extra';
import { join } from 'path';

function translate(dump: any, path: string) {
    const type = typeof dump;
    if (!dump || type !== 'object') {
        return;
    }
    if (Array.isArray(dump)) {
        dump.forEach((item, index) => {
            item.name = `[${index}]`;
            item.path = `${path}.${index}`;
            translate(item.value, item.path);
        });
    }
    for (const name of Object.keys(dump)) {
        const item = dump[name];
        if (item && typeof item === 'object') {
            item.name = name;
            item.path = `${path}.${name}`;
            translate(item.value, item.path);
        }
    }
}

export function translationDump(dump: any) {

    dump.active.name = 'Active';
    dump.name.name = 'Name';
    dump.position.name = 'Position';
    dump.rotation.name = 'Rotation';
    dump.scale.name = 'Scale';

    dump.active.path = 'active';
    dump.name.path = 'name';
    dump.position.path = 'position';
    dump.rotation.path = 'rotation';
    dump.scale.path = 'scale';

    dump.__comps__.forEach((component: any, index: number) => {
        component.name = component.type;
        component.path = `__comps__.${index}`;
        translate(component.value, component.path);
    });

    return dump;
}

export function transSceneDump(dump: any) {
    dump.active.name = 'Active';
    dump.name.name = 'Name';
    for (const name of Object.keys(dump.value)) {
        const item = dump.value[name];
        item.name = name;
        translate(item.value, `_globals.${name}`);
    }
    return dump;
}

export function readTemplate(path: string) {
    path = join(__dirname, `../../../static/template/components/`, path);
    return readFileSync(path, 'utf8');
}
