
const DERACTIONS = ['-X', '+X', '+Y', '-Y', '+Z', '-Z'];
const KEYS = ['left', 'right', 'top', 'bottom', 'front', 'back'];
export const template = `
<section class="asset-texture-cube">
    <div class="ui-prop" v-for="(name, index) in KEYS">
        <div class="name">
            <span
                :title="name"
            >{{name}} ( {{DERACTIONS[index]}} ) </span>
        </div>
        <div class="content">
            <ui-asset
                type="cc.Texture2D"
                v-model="meta.userData[name]"
                v-on:input="updateCanvas(name)"
            ></ui-asset>
        </div>
    </div>
    <div class="texture-cube-preview" ref="preview">
        <div class="center">
            <canvas v-for="name in KEYS"
                :width="size"
                :height="size"
                :class="name"
                :ref="name""
            ></canvas>
            <div class="info" v-for="name in KEYS"
                :class="name"
            >{{name}}</div>
        </div>
    </div>
</section>
`;

export const props = ['info', 'meta', 'width'];

export const components = {
    'ui-asset': require('./../../../public/ui-asset'),
};

export const methods = {
    /**
     * 刷新页面
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;
        if (!vm.info || !vm.meta) {
            return;
        }
        Promise.all(KEYS.map(async (name: string) => {
            await vm.updateCanvas(name);
        }));
    },

    calcSize() {
        // @ts-ignore
        const vm: any = this;
        const { clientWidth, clientHeight } = vm.$refs.preview;
        vm.size = Math.round(Math.min((clientWidth - 40) / 4, (clientHeight - 40) / 3));
        vm.$refs.preview.style.setProperty('--size', vm.size + 'px');
    },

    async updateCanvas(key: string) {
        // @ts-ignore
        const vm: any = this;
        const uuid = vm.meta.userData[key] && vm.meta.userData[key].uuid;
        const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', uuid);
        if (!meta) {
            vm.clearCanvas(key);
            return;
        }
        const imageSrc = await getImageLikeAssetSource(meta);
        if (!imageSrc) {
            vm.clearCanvas(key);
            return;
        }
        vm.images[key] = new Image();
        vm.images[key].src = imageSrc;
        vm.images[key].onload = () => {
            vm.repaitCanvas(key);
        };
    },

    repaitCanvas(key: string) {
        this.clearCanvas(key);
        // @ts-ignore
        this.ctxs[key].drawImage(this.images[key], 0, 0, this.size, this.size);
    },

    clearCanvas(key: string) {
        // @ts-ignore
        this.ctxs[key].clearRect(0, 0, this.size, this.size);
    },

    initCanvas(this: any) {
        for (const name of KEYS) {
            const ctx = this.$refs[name][0].getContext('2d');
            this.ctxs[name] = ctx;
        }
    },
};

export const watch = {
    meta() {
        // @ts-ignore
        this.refresh();
    },
    width() {
        // @ts-ignore
        this.calcSize();
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        KEYS,
        DERACTIONS,
        size: 40,
        images: {},
        ctxs: {},
    };
}

export function mounted() {
    // @ts-ignore
    this.calcSize();
    // @ts-ignore
    this.initCanvas();
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
