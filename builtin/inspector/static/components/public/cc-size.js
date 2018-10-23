'use strict';

exports.template = `
<div class="cc-size vue-comp-ui">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value" v-if="dump">
        <span>W</span>
        <ui-num-input
            :value="dump.value.width"
            :disabled="disabled"
            @confirm.stop="_onWidthConfirm"
        ></ui-num-input>
        <span>H</span>
        <ui-num-input
            :value="dump.value.height"
            :disabled="disabled"
            @confirm.stop="_onHeightConfirm"
        ></ui-num-input>
        <slot name="suffix"></slot>
    </div>

    <div class="value" v-else>
        <span>W</span>
        <ui-num-input
            :value="metaVal.width"
            :disabled="disabled"
            @confirm.stop="_onWidthConfirm"
        ></ui-num-input>
        <span>H</span>
        <ui-num-input
            :value="metaVal.height"
            :disabled="disabled"
            @confirm.stop="_onHeightConfirm"
        ></ui-num-input>
        <slot name="suffix"></slot>
    </div>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'meta',
    'path',
    'disabled'
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

exports.computed = {
    metaVal: {
        get() {
            if (this.path) {
                return (this.path + '').split('.').reduce((prev, next) => {
                    if (prev) {
                        try {
                            return prev[next];
                        } catch (err) {
                            console.error(err);
                            return void 0;
                        }
                    }
                }, this.meta);
            }
        },
        set(newVal) {
            if (this.path) {
                const paths = (this.path + '').split('.');
                const key = paths.pop();
                const target = paths.reduce((prev, next) => {
                    if (prev) {
                        try {
                            return prev[next];
                        } catch (err) {
                            console.error(err);
                            return void 0;
                        }
                    }
                }, this.meta);
                if (target) {
                    target.hasOwnProperty(key) ? (target[key] = newVal) : this.$set(target, key, newVal);
                }
            }
        }
    }
};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispatch() {
        const eventType = this.dump ? 'property-changed' : 'meta-changed';
        const evt = document.createEvent('HTMLEvents');
        evt.initEvent(eventType, true, true);
        this.$el.dispatchEvent(evt);
    },

    /**
     * width 修改
     */
    _onWidthConfirm(event) {
        const target = this.dump ? this.dump.value : this.metaVal;
        target.width = event.target.value;
        this.dispatch();
    },

    /**
     * height 修改
     */
    _onHeightConfirm(event) {
        const target = this.dump ? this.dump.value : this.metaVal;
        target.height = event.target.value;
        this.dispatch();
    }
};
