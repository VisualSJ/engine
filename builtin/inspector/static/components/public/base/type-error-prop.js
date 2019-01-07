'use strict';

exports.components = {
    'ui-prop': require('../ui-prop'),
};

exports.template = `
    <ui-prop
        :name="dump.name"
        :indent="indent"
        style="padding-top: 10px;"
    >
        <div class="error-wrapper">Type Error</div>
        <span class="flex-1"></span>
        <ui-button class="tiny blue" @confirm="_onReset">Reset</ui-button>
    </ui-prop>
`;

exports.props = [
    'dump', // dump 数据
    'indent', // 是否需要缩进
];

exports.methods = {
    _onReset() {
        this.$el.dispatchEvent(
            new CustomEvent('reset-prop', {
                bubbles: true,
                detail: {
                    path: this.dump.path,
                    type: this.dump.attrs.type,
                },
            })
        );
    },
};
