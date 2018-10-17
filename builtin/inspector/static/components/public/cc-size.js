'use strict';

exports.template = `
<div class="cc-size">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value">
        <span>W</span>
        <ui-num-input
            :value="dump.value.width"
            @confirm.stop="_onWidthConfirm($event)"
        ></ui-num-input>
        <span>H</span>
        <ui-num-input
            :value="dump.value.height"
            @confirm.stop="_onHeightConfirm($event)"
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
     * width 修改
     */
    _onWidthConfirm(event) {
        this.dump.value.width = event.target.value;
        this.dispactch();
    },

    /**
     * height 修改
     */
    _onHeightConfirm(event) {
        this.dump.value.height = event.target.value;
        this.dispactch();
    }
};
