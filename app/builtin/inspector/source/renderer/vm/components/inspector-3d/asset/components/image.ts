'use strict';

export const template = `
<section class="asset-image">
    <ui-prop class="type"
        label="Type"
    >
        <ui-select slot="content"
            :value="meta ? meta.userData.type : ''"
            @confirm="_onDataChanged($event, 'type')"
        >
            <option
                v-for="(item, index) in types"
                :value="item"
                :index="index"
            >{{item}}</option>
        </ui-select>
    </ui-prop>

    <ui-prop class="flipVertical"
        label="FlipVertical"
    >
        <ui-checkbox slot="content"
            :value="meta ? meta.userData.flipVertical : false"
            @confirm="_onDataChanged($event, 'flipVertical')"
        ></ui-checkbox>
    </ui-prop>

    <ui-prop class="isRGBE"
        label="isRGBE"
        v-if="meta ? meta.userData.type==='texture cube' : false"
    >
        <ui-checkbox slot="content"
            :value="meta ? meta.userData.isRGBE : false"
            @confirm="_onDataChanged($event, 'isRGBE')"
        ></ui-checkbox>
    </ui-prop>

    <div class="platform-setting">
        <div class="platforms">
            <div class="platform-item"
                :active="tab === 'default'"
                @click="tab = 'default'"
            >
                <span >Default</span>
            </div>
            <div
                v-for = "name in platforms"
                :active="tab === name"
                @click="tab = name"
            >
                <span :class="['icon-' + name, 'iconfont']" ></span>
            </div>
        </div>

        <div class="settings">
            <ui-select value="none"
                @confirm="_onFormatAdded($event)"
            >
                <option
                    v-for="name in defaultOption"
                    :value="name"
                >{{formatsInfo[name]}}</option>
                <option
                    v-if="_supportFormat('pvr', tab)"
                    v-for="extname in pvrOption"
                    :value="extname"
                >{{formatsInfo[extname]}}</option>
                <option
                    v-if="_supportFormat('etc1', tab)"
                    v-for="extname in etc1Option"
                    :value="extname"
                >{{formatsInfo[extname]}}</option>
                <option
                    v-if="_supportFormat('etc2', tab)"
                    v-for="extname in etc2Option"
                    :value="extname"
                >{{formatsInfo[extname]}}</option>
            </ui-select>
            <div class="formats"
                v-if="meta && meta.userData && meta.userData.platformSettings"
            >
                <div class="item"
                    v-for="(value,key) in meta.userData.platformSettings[tab]"
                >
                    <div>{{key}} | Quality</div>
                    <ui-select
                        :value="value"
                        @confirm="_onFormatChanged($event, key)"
                        v-if="_isPVRFormat(key)"
                    >
                        <option value="fastest">Fastest</option>
                        <option value="fast">Fast</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="best">Best</option>
                    </ui-select>
                    <ui-select
                        :value="value"
                        @confirm="_onFormatChanged($event, key)"
                        v-if="_isETCFormat(key)"
                    >
                        <option value="slow">Slow</option>
                        <option value="fast">Fast</option>
                    </ui-select>
                    <ui-num-input max="100" min="0" step="10" preci="2"
                        :value="value"
                        @confirm="_onFormatChanged($event, key)"
                        v-if="!_isPVRFormat(key) && !_isETCFormat(key)"
                    ></ui-num-input>
                    <ui-button class="iconfont icon-del transparent red"
                        @confirm="_onFormatDeleted(key)"
                    ></ui-button>
                </div>
            </div>
        </div>
    </div>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {};

export const methods = {

    /**
     * 更改图片的导入类型
     */
    _onDataChanged(event: any, key: string) {
        // @ts-ignore
        const vm: any = this;
        vm.meta.userData[key] = event.target.value;
    },

    /**
     * 添加平台图片格式设置
     */
    _onFormatAdded(event: any) {
        // @ts-ignore
        const vm: any = this;

        const type = event.target.value;
        event.target.value = 'none';
        if (type === 'none') {
            return;
        }
        if (!vm.meta.userData.platformSettings) {
            vm.$set(vm.meta.userData, 'platformSettings', {});
        }

        const formatSetting = vm.meta.userData.platformSettings;
        // 已经添加过当前平台的设置
        if (formatSetting && formatSetting[vm.tab] && formatSetting[vm.tab][type]) {
            return;
        }
        if (!formatSetting[vm.tab]) {
            vm.$set(vm.meta.userData.platformSettings, vm.tab, {});
        }
        vm.$set(vm.meta.userData.platformSettings[vm.tab], type, this._defaultQuality(type));
    },

    /**
     * 删除平台图片格式设置
     */
    _onFormatDeleted(type: string) {
        // @ts-ignore
        const vm: any = this;
        vm.$delete(vm.meta.userData.platformSettings[vm.tab], type);
    },

    /**
     * 更改平台图片格式设置
     */
    _onFormatChanged(event: any, type: string) {
        // @ts-ignore
        const vm: any = this;
        const value = event.target.value;
        vm.$set(vm.meta.userData.platformSettings[vm.tab], type, value);
    },

    /**
     * 检查对应平台是否支持该格式
     */
    _supportFormat(format: string, platform: string) {
        if (format === 'pvr' && (platform === 'android' || platform === 'default')) {
            return false;
        } else if (format === 'etc1' && (platform === 'ios' || platform === 'default')) {
            return false;
        } else if (format === 'etc2' && (platform !== 'android' && platform !== 'ios')) {
            // android 和 ios 才支持 etc2, 目前 web 支持有限，暂不考虑
            return false;
        }
        return true;
    },

    _isPVRFormat(format: string) {
        return format.startsWith('pvrtc_');
    },

    _isETCFormat(format: string) {
        return format.startsWith('etc1') || format.startsWith('etc2');
    },

    _defaultQuality(format: string) {
        if (this._isPVRFormat(format)) {
            return 'normal';
        } else if (this._isETCFormat(format)) {
            return 'fast';
        }

        return 80;
    },
};

export const watch = {};

export function data() {
    return {
        types: [
            'raw',
            'texture',
            'normal map',
            'sprite-frame',
            'texture cube',
        ],

        tab: 'default',
        platforms: ['android', 'ios', 'wechat', 'html5'],
        defaultOption: ['none', 'png', 'jpg', 'webp'],
        pvrOption: ['pvrtc_4bits', 'pvrtc_4bits_rgb', 'pvrtc_2bits', 'pvrtc_2bits_rgb'],
        etc1Option: ['etc1_rgb'],
        etc2Option: ['etc2', 'etc2_rgb'],
        formatsInfo: {
            none: 'Select A Format To Add',
            png: 'PNG',
            jpg: 'JPG',
            webp: 'WEBP',
            pvrtc_4bits: 'PVRTC 4bits RGBA',
            pvrtc_4bits_rgb: 'PVRTC 4bits RGB',
            pvrtc_2bits: 'PVRTC 2bits RGBA',
            pvrtc_2bits_rgb: 'PVRTC 2bits RGB',
            etc1_rgb: 'ETC1 RGB',
            etc2: 'ETC2 RGBA',
            etc2_rgb: 'ETC2 RGB',
        },
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
}
