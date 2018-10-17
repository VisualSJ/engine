'use strict';

exports.template = `
<div class="boolean">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value" v-if="dump">
        <ui-checkbox
            :value="dump.value"
            @confirm.stop="_onConfirm"
        ></ui-checkbox>
    </div>
    <div class="value"
        v-else
    >
        <ui-checkbox
            :value="value"
            @confirm.stop="_onConfirm"
        ></ui-checkbox>
    </div>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'value'
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

    /**
     * value 修改
     */
    _onConfirm(event) {
        if (this.dump) {
            this.dump.value = event.target.value;
            this.dispactch();
        } else {
            this.value = event.target.value;
            this.dispactch();
        }
    }
};
