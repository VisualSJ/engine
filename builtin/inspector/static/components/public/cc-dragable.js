'use strict';

exports.template = `
<div :class="{'cc-dragable': true, 'vue-comp-ui': true, 'flex-wrap': !!$slots.child}">
    <div class="name">
        <i
            :class="{
                iconfont: true,
                'icon-un-fold': !foldUp,
                'icon-fold': foldUp,
                'is-visible': (dump && dump.foldable) || foldable
            }"
            @click="foldUp = !foldUp"
        ></i>
        <span class="flex-1 label"
            :style="paddingStyle"
        >{{name ? name : 'Unknown'}}</span>
        <div class="lock"
            v-if="(dump && dump.readonly) || readonly"
        ><i class="iconfont icon-lock"></i></div>
    </div>
    <div class="value" v-if="dump">
        <ui-drag-object
            :dropable="dump.type"
            :value="dump.value.uuid || ''"
            :disabled="disabled"
            :readonly="dump.readonly || readonly"
            @confirm="_onConfirm"
        ></ui-drag-object>
        <slot name="suffix"></slot>
        <slot name="sibling"></slot>
    </div>
    <div class="value" v-else>
        <ui-drag-object
            :type="type"
            :value="metaVal || ''"
            :disabled="disabled"
            :readonly="readonly"
            @confirm="_onConfirm"
        ></ui-drag-object>
        <slot name="suffix"></slot>
        <slot name="sibling"></slot>
    </div>
    <slot name="child"></slot>
</div>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'path',
    'meta',
    'type',
    'disabled',
    'readonly',
    'foldable',
];

exports.data = function() {
    return {
        foldUp: false,
        paddingStyle:
            this.indent !== undefined
                ? {
                      'padding-left': `${this.indent * 13}px`,
                  }
                : '',
    };
};

exports.computed = {
    metaVal: {
        get() {
            if (this.path) {
                return (this.path + '')
                    .split('.')
                    .reduce((prev, next) => {
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
                    target.hasOwnProperty(key)
                        ? (target[key] = newVal)
                        : this.$set(target, key, newVal);
                }
            }
        },
    },
};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispatch() {
        const eventType = this.dump
            ? 'property-changed'
            : 'meta-changed';
        const evt = document.createEvent('HTMLEvents');
        evt.initEvent(eventType, true, true);
        this.$el.dispatchEvent(evt);
    },

    /**
     * value 修改
     */
    _onConfirm(event) {
        const { value: uuid } = event.target;
        if (this.dump) {
            this.dump.value.uuid = uuid;
        } else {
            this.metaVal = uuid;
        }
        this.dispatch();
    },
};
