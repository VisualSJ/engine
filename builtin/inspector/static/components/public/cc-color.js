'use strict';

exports.template = `
<div class="cc-color">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value">
        <ui-color
            :value="t(dump.value)"
            @confirm.stop="_onConfirm($event)"
        ></ui-color>
    </div>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent' // 是否需要缩进
];

exports.data = function() {
    return {
        paddingStyle:
            this.indent !== undefined
                ? {
                      'padding-left': `${this.indent * 13}px`
                  }
                : ''
    };
};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispactch() {
        let evt = document.createEvent('HTMLEvents');
        evt.initEvent('property-changed', true, true);
        this.$el.dispatchEvent(evt);
    },

    t(color) {
        return JSON.stringify([color.r, color.g, color.b, color.a / 255]);
    },

    _onConfirm(event) {
        const color = this.dump.value;
        const value = event.target.value;

        color.r = value[0];
        color.g = value[1];
        color.b = value[2];
        color.a = value[3];

        this.dispactch();
    }
};
