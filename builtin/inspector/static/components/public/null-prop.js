'use strict';

exports.template = `
    <div class="vue-comp-ui flex-wrap null-prop">
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
            >{{name ? name || (dump && dump.name) : 'Unknown'}}</span>
            <div class="lock"
                v-if="(dump && dump.readonly) || readonly"
            ><i class="iconfont icon-lock"></i></div>
        </div>
        <div class="value">
            <div class="object-value">Null</div>
            <div class="object-type">{{dump.attrs.typename}}</div>
            <span class="flex-1"></span>
            <div class="align-self-center">
                <ui-button
                    class="tiny blue"
                    @confirm="applyAction"
                >{{action}}</ui-button>
            </div>
        </div>
    </div>
`;
exports.props = {
    dump: {
        required: true,
        type: Object,
    },
    indent: {
        type: Number,
        default: 0,
    },
    readonly: {
        type: Boolean,
        default: false,
    },
    foldable: {
        type: Boolean,
        default: false,
    },
    name: {
        type: String,
        default: '',
    },
};

exports.data = function() {
    return {
        action: 'Create',
        foldUp: false,
        paddingStyle:
            this.indent !== 0
                ? {
                      'padding-left': `${this.indent * 13}px`,
                  }
                : '',
    };
};

exports.mounted = function() {
    this.updateAction();
};

exports.methods = {
    updateAction() {
        const { type } = this.dump.attrs;
        if (
            [
                'String',
                'Enum',
                'Boolean',
                'Float',
                'Integer',
            ].includes(type)
        ) {
            this.action = 'Reset';
        } else {
            this.action = 'Create';
        }
    },

    applyAction() {
        if (this.action === 'Create') {
            // todo
        } else {
            // todo
        }
    },
};
