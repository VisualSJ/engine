'use strict';

exports.template = `
<div class="cc-vec2">
    <div class="name">{{name ? name : 'Unknown'}}</div>
    <div class="value">
        <span>X</span>
        <ui-num-input
            :value="dump ? dump.value.x : 0"
            @confirm.stop="_onXConfirm($event)"
        ></ui-num-input>
        <span>Y</span>
        <ui-num-input
            :value="dump ? dump.value.y : 0"
            @confirm.stop="_onYConfirm($event)"
        ></ui-num-input>
    </div>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
];

exports.data = function() {
    return {};
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
};
