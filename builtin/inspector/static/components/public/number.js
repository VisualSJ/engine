'use strict';

exports.template = `
<div class="number">
    <div class="name">{{name ? name : 'Unknown'}}</div>
    <div class="value">
        <ui-num-input
            :value="dump.value"
            @confirm.stop="_onConfirm($event)"
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
     * 数值修改
     */
    _onConfirm(event) {
        this.dump.value = event.target.value;
        this.dispactch();
    },
};
