'use strict';

export const template = `
<section class="asset-directory">
    <div class="path">
        <div class="name">
            <span>{{info.source}}</span>
        </div>
        <div class="button">
            <ui-button class="blue explore-btn" tabindex="0">
                <i class="iconfont icon-folderopen"></i>
            </ui-button>
        </div>
    </div>

    <div class="content">
        <ui-prop
            label="配置为子包"
            type="boolean"
            value="false"
        ></ui-prop>
        <ui-prop
            label="子包名"
            type="string"
            value=""
        ></ui-prop>
    </div>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
