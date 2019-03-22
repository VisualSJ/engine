'use strict';

import { close, open, update } from '../../../../../../sprite-editor/manager';

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
        <ui-prop label="Mip Filter">
            <ui-select slot="content"
                :value="meta.userData.mipfilter"
                @change="_onChangeData($event, 'mipfilter')"
            >
                <option
                    v-for="item in ['none', 'nearest' , 'linear']"
                    :value="item"
                >{{item}}</option>
            </ui-select>
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
        <ui-prop label="Rotated">
            <ui-checkbox slot="content" disabled
                :value="meta.userData.rotated"
                @change="_onChangeData($event, 'rotated')"
            ></ui-checkbox>
        </ui-prop>
        <ui-prop label="Offset X">
            <ui-num-input slot="content" disabled
                :value="meta.userData.offsetX"
                @change="_onChangeData($event, 'offsetX')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Offset Y">
            <ui-num-input slot="content" disabled
                :value="meta.userData.offsetY"
                @change="_onChangeData($event, 'offsetY')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Trim Type">
            <ui-select slot="content"
                :value="meta.userData.trimType"
                @change="_onChangeData($event, 'trimType')"
            >
                <option
                    v-for="item in ['auto', 'custom']"
                    :value="item"
                >{{item}}</option>
            </ui-select>
        </ui-prop>
        <ui-prop label="Trim Threshold">
            <ui-num-input slot="content"
                :value="meta.userData.trimThreshold"
                @change="_onChangeData($event, 'trimThreshold')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Trim X"
            :disabled="!isCustom()"
        >
            <ui-num-input slot="content"
                :value="meta.userData.trimX"
                @change="_onChangeData($event, 'trimX')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Trim Y"
            :disabled="!isCustom()"
        >
            <ui-num-input slot="content"
                :value="meta.userData.trimY"
                @change="_onChangeData($event, 'trimY')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Trim Width"
            :disabled="!isCustom()"
        >
            <ui-num-input slot="content"
                :value="meta.userData.width"
                @change="_onChangeData($event, 'width')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Trim Height"
            :disabled="!isCustom()"
        >
            <ui-num-input slot="content"
                :value="meta.userData.height"
                @change="_onChangeData($event, 'height')"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Border Top">
            <ui-num-input slot="content"
                :value="meta.userData.borderTop"
                @change="_onChangeData($event, 'borderTop')"
                :max="meta.userData.height - meta.userData.borderBottom"
                :min="0"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Border Bottom">
            <ui-num-input slot="content"
                :value="meta.userData.borderBottom"
                @change="_onChangeData($event, 'borderBottom')"
                :max="meta.userData.height - meta.userData.borderTop"
                :min="0"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Border Left">
            <ui-num-input slot="content"
                :value="meta.userData.borderLeft"
                @change="_onChangeData($event, 'borderLeft')"
                :max="meta.userData.width - meta.userData.borderRight"
                :min="0"
            ></ui-num-input>
        </ui-prop>
        <ui-prop label="Border Right">
            <ui-num-input slot="content"
                :value="meta.userData.borderRight"
                :max="meta.userData.width - meta.userData.borderLeft"
                :min="0"
                @change="_onChangeData($event, 'borderRight')"
            ></ui-num-input>
        </ui-prop>
        <div align="center">
            <ui-button tabindex="0"
                @click="openSpriteEditor"
            >{{t('edit')}}</ui-button>
        </div>
    </div>

    <asset-image-preview
        v-if="imgSrc && meta"
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
     * 翻译文本
     * @param key
     */
    t(key: string) {
        return Editor.I18n.t(`inspector.asset.spriteFrame.${key}`);
    },

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
        update();
    },

    isCustom(): boolean {
        // @ts-ignore
        return this.meta.userData.trimType === 'custom';
    },

    openSpriteEditor() {
        open(this);
    },

    saveSpriteEditor(json: any) {
        const keys = Object.keys(json);
        for (const key of keys) {
            // @ts-ignore
            this.$set(this.meta.userData, key, json[key]);
        }
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

export function destroyed() {
    // @ts-ignore
    close(this);
}

// @ts-ignore
async function getImageLikeAssetSource(meta: any) {
    switch (meta.importer) {
        case 'image':
        case 'gltf-embeded-image': {
            return getLibrariedSource(meta);
        }
        case 'sprite-frame':
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
