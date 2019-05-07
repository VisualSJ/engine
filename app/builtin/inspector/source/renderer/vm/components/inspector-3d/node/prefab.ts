'use strict';

export const template = `
<div class="prefab">
    <span class="title">Entire Prefab</span>
    <ui-button
        @click="twinkle"
    >
        <ui-label value="i18n:inspector.prefab.local"></ui-label>
    </ui-button>
    <ui-button
        @click="restore"
    >
        <ui-label value="i18n:inspector.prefab.reset"></ui-label>
    </ui-button>
    <ui-button
        @click="update"
    >
        <ui-label value="i18n:inspector.prefab.save"></ui-label>
    </ui-button>
</div>
`;

export const props = [
    'dump',
];

export function data() {
    return {
        rootUuid: '',
        assetUuid: '',
    };
}

export const methods = {
    twinkle() {
        // @ts-ignore
        Editor.Ipc.sendToPanel('assets', 'twinkle', this.assetUuid);
    },
    async restore() {
        Editor.Ipc.sendToPanel('scene', 'snapshot');
        // @ts-ignore
        await Editor.Ipc.requestToPackage('scene', 'restore-prefab', this.rootUuid, this.assetUuid);
    },
    async update() {
        // @ts-ignore
        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.assetUuid);

        let url = '';
        if (info) {
            url = info.source;
        } else {
            // @ts-ignore
            const dump = await Editor.Ipc.requestToPackage('scene', 'query-node', this.rootUuid);
            url = `db://assets/${dump.name.value}.prefab`;
            url = await Editor.Ipc.requestToPackage('asset-db', 'generate-available-url', url);
        }
        // @ts-ignore
        const content = await Editor.Ipc.requestToPackage('scene', 'getdata-prefab', this.rootUuid);

        // @ts-ignore
        await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, content, { overwrite: true });
    }
};

export const watch = {
    dump() {
        // @ts-ignore
        this.rootUuid = this.dump.__prefab__.rootUuid;
        // @ts-ignore
        this.assetUuid = this.dump.__prefab__.uuid;
    },
};

export function mounted() {
    // @ts-ignore
    this.rootUuid = this.dump.__prefab__.rootUuid;
    // @ts-ignore
    this.assetUuid = this.dump.__prefab__.uuid;
}
