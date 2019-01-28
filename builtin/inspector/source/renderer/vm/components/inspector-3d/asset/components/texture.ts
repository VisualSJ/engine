'use strict';

export const template = `
<section class="asset-texture">
    <div class="content"
        v-if="meta"
    >
        <ui-prop label="Anisotropy">
            <ui-num-input slot="content"
                :value="meta.userData.anisotropy"
                @change="_onChangeData($event, 'anisotropy')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Mag Filter">
            <ui-select slot="content"
                :value="meta.userData.magfilter"
                @change="_onChangeData($event, 'magfilter')"
            >
                <option
                    v-for="item in ['nearest' , 'linear']"
                    :value="item"
                >{{item}}</option>
            </ui-select>
        </ui-prop>
        <ui-prop label="Min Filter">
            <ui-select slot="content"
                :value="meta.userData.minfilter"
                @change="_onChangeData($event, 'minfilter')"
            >
                <option
                    v-for="item in ['nearest' , 'linear']"
                    :value="item"
                >{{item}}</option>
            </ui-select>
        </ui-prop>
        <ui-prop label="Premultiply Alpha">
            <ui-checkbox slot="content"
                :value="meta.userData.premultiplyAlpha"
                @change="_onChangeData($event, 'premultiplyAlpha')"
            ></ui-checkbox>
        </ui-prop>
        <ui-prop label="Wrap Mode S">
            <ui-select slot="content"
                :value="meta.userData.wrapModeS"
                @change="_onChangeData($event, 'wrapModeS')"
            >
                <option
                    v-for="item in ['repeat', 'clamp-to-edge', 'mirrored-repeat']"
                    :value="item"
                >{{item}}</option>
            </ui-select>
        </ui-prop>
        <ui-prop label="Wrap Mode T">
            <ui-select slot="content"
                :value="meta.userData.wrapModeT"
                @change="_onChangeData($event, 'wrapModeT')"
            >
                <option
                    v-for="item in ['repeat', 'clamp-to-edge', 'mirrored-repeat']"
                    :value="item"
                >{{item}}</option>
            </ui-select>
        </ui-prop>
    </div>

    <asset-image-preview
        v-if="meta"
        :meta="meta"
        :imgSrc="imgSrc"
    ></asset-image-preview>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {
    'asset-image-preview': require('../public/image-preview'),
};

export const methods = {

    /**
     * 刷新当前页面显示的数据
     */
    async refresh() {
        // @ts-ignore
        const vm: any = this;
        try {
            if (!vm.meta) {
                return vm.imgSrc = '';
            }
            vm.imgSrc = await getImageLikeAssetSource(vm.meta);
        } catch (err) {
            console.error(err);
            vm.imgSrc = '';
        }
    },

    /**
     * 修改 meta 数据
     * @param event
     * @param key
     */
    _onChangeData(event: any, key: string) {
        // @ts-ignore
        const vm: any = this;
        vm.$set(vm.meta.userData, key, event.target.value);
    },
};

export const watch = {
    meta() {
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        imgSrc: '',
    };
}

export function mounted() {
    // @ts-ignore
    this.refresh();
}

// @ts-ignore
async function getImageLikeAssetSource(meta: any) {
    switch (meta.importer) {
        case 'image':
        case 'gltf-embeded-image':
            return getLibrariedSource(meta);

        case 'texture': {
            const userData = meta.userData;
            const imageUuid = userData.imageUuidOrDatabaseUri;
            if (!imageUuid) {
                return '';
            }
            if (!userData.isUuid) {
                const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', imageUuid);
                return info.path;
            }
            if (!imageUuid) {
                return '';
            }

            const imageMeta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', imageUuid);
            return getImageLikeAssetSource(imageMeta);
        }
        default:
            return '';
    }
}

async function getLibrariedSource(meta: any) {
    const { library } = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', meta.uuid);

    const key = Object.keys(library).find((key) => key !== '.json');
    if (!key) {
        return '';
    }
    return library[key];
}
