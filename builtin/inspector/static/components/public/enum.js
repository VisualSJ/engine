'use strict';

exports.template = `
<div class="enum">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value">
        <ui-select
            :value="dump.value"
            @confirm.stop="_onConfirm"
        >
            <option
                :key="index"
                v-for="(item, index) in dump.enumList"
                :value="JSON.stringify(item.value)"
            >
                {{item.name || item.value}}
            </option>
        </ui-select>
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
        this.dump.value = event.target.value;
        this.dispactch();
    }
};
