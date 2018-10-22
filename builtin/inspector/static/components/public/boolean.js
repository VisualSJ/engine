'use strict';

exports.template = `
<div class="boolean vue-comp-ui">
    <div class="name"
        :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value" v-if="dump">
        <ui-checkbox
            :value="dump.value"
            :disabled="disabled"
            @confirm.stop="_onConfirm"
        ></ui-checkbox>
    </div>
    <div class="value"
        v-else
    >
        <ui-checkbox
            :value="metaVal"
            :disabled="disabled"
            @confirm.stop="_onConfirm"
        ></ui-checkbox>
    </div>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'path',
    'meta',
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
     * value 修改
     */
    _onConfirm(event) {
        const { value } = event.target;
        if (this.dump) {
            this.dump.value = value;
        } else {
            this.metaVal = value;
        }
        this.dispatch();
    }
};
