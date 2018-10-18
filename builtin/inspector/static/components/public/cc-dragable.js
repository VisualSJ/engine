'use strict';

exports.template = `
<div class="cc-dragable vue-com-ui">
    <div class="name"
         :style="paddingStyle"
    >
        {{name ? name : 'Unknown'}}
    </div>
    <div class="value" v-if="dump">
        <ui-drag-object
            :type="dump.type"
            :value="dump.value.uuid"
            :disabled="disabled"
        ></ui-drag-object>
    </div>
    <div class="value" v-else>
        <ui-drag-object
            :type="type"
            :value="metaVal"
            :disabled="disabled"
        ></ui-drag-object>
    </div>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'path',
    'meta',
    'type',
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
                return this.path.split('.').reduce((prev, next) => {
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
                const paths = this.path.split('.');
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
        const uuid = event.target.value;
        if (this.dump) {
            dump.value.uuid = uuid;
        } else {
            this.metaVal = uuid;
        }
        this.dispatch();
    }
};
