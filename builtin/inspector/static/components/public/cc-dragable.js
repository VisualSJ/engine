'use strict';

exports.template = `
<div class="cc-dragable">
    <div class="name"
         :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value">
        <ui-drag-object
            :type="dump.type"
            :value="dump.value.uuid"
        ></ui-drag-object>
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
     * value 修改
     */
    _onConfirm(event) {
        this.dump.value.uuid = event.target.value;
        this.dispactch();
    }
};
