'use strict';

import { readFileSync } from 'fs';

export const template = `
<section class="asset-image">
    <ui-prop class="type"
        label="Type"
    >
        <ui-select slot="content"
            :value="meta ? meta.userData.type : ''"
            @confirm="_onTextureTypeChanged($event)"
        >
            <option
                v-for="(item, index) in types"
                :value="item"
                :index="index"
            >{{item}}</option>
        </ui-select>
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
                v-if="tab !== 'default' && tab !== 'android'"
                v-for="extname in extOption"
                :value="extname"
            >{{formatsInfo[extname]}}</option>
        </ui-select>
        <div class="formats"
            v-if="meta && meta.userData && meta.userData.platformSettings"
        >
            <div class="item"
                v-for="(item,key) in meta.userData.platformSettings[tab]"
                v-if="item"
            >
                <div>{{key}} | Quality</div>
                <ui-num-input max="1" min="0" step="0.1" preci="2"
                    :value="item.quality"
                    @confirm="_onFormatChanged($event, key)"
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
    _onTextureTypeChanged(event: any) {
        // @ts-ignore
        const vm: any = this;
        vm.meta.userData.type = event.target.value;
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
        vm.$set(vm.meta.userData.platformSettings[vm.tab], type, {
            quality: 0.8,
        });
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
        vm.$set(vm.meta.userData.platformSettings[vm.tab], type, {
            quality: value,
        });
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
        extOption: ['pvrtc_4bits', 'pvrtc_4bits_rgb', 'pvrtc_2bits', 'pvrtc_2bits_rgb'],
        formatsInfo: {
            none: 'Select A Format To Add',
            png: 'PNG',
            jpg: 'JPG',
            webp: 'WEBP',
            pvrtc_4bits: 'PVRTC 4bits RGBA',
            pvrtc_4bits_rgb: 'PVRTC 4bits RGB',
            pvrtc_2bits: 'PVRTC 2bits RGBA',
            pvrtc_2bits_rgb: 'PVRTC 2bits RGB',
        },
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
}
