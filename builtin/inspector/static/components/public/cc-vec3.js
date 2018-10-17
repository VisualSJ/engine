'use strict';

exports.template = `
<div class="cc-vec3">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value">
        <span>X</span>
        <ui-num-input
            :value="dump ? dump.value.x : 0"
            @confirm.stop="_onXConfirm"
        ></ui-num-input>
        <span>Y</span>
        <ui-num-input
            :value="dump ? dump.value.y : 0"
            @confirm.stop="_onYConfirm"
        ></ui-num-input>
        <span>Z</span>
        <ui-num-input
            :value="dump ? dump.value.z : 0"
            @confirm.stop="_onZConfirm"
        ></ui-num-input>
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

    /**
     * x 值修改
     */
    _onXConfirm(event) {
        this.dump.value.x = event.target.value;
        this.dispactch();
    },

    /**
     * y 值修改
     */
    _onYConfirm(event) {
        this.dump.value.y = event.target.value;
        this.dispactch();
    },

    /**
     * z 值修改
     */
    _onZConfirm(event) {
        this.dump.value.z = event.target.value;
        this.dispactch();
    }
};
