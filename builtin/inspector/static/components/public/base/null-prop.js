'use strict';

// exports.template = `
//     <ui-prop
//         class="null-prop"
//         :name="dump.name"
//     >
//         <div class="object-value">Null</div>
//         <div class="object-type">{{dump.attrs.typename}}</div>
//         <span class="flex-1"></span>
//         <ui-button
//             class="tiny blue"
//             @confirm="applyAction"
//         >{{action}}</ui-button>
//     </ui-prop>
// `;
exports.props = {
    dump: {
        required: true,
        type: Object,
    },
};

exports.components = {
    'ui-prop': require('../ui-prop'),
};

exports.data = function() {
    return {
        action: 'Create',
    };
};

exports.mounted = function() {
    this.updateAction();
};

exports.methods = {
    updateAction() {
        const { type } = this.dump.attrs;
        if (['String', 'Enum', 'Boolean', 'Float', 'Integer'].includes(type)) {
            this.action = 'Reset';
        } else {
            this.action = 'Create';
        }
    },

    dispatch(type) {
        const event = new CustomEvent(type, {
            bubbles: true,
            detail: {
                path: this.dump.path,
                type: this.dump.attrs.type,
            },
        });

        this.$el.dispatchEvent(event);
    },

    applyAction() {
        if (this.action === 'Create') {
            // todo
            this.dispatch('new-prop');
        } else {
            // todo
            this.dispatch('reset-prop');
        }
    },
};

exports.render = function(h) {
    return h(
        'ui-prop',
        {
            staticClass: 'null-prop',
            attrs: {
                ...this.$attrs,
            },
            props: {
                ...this.$props,
            },
            on: {
                ...this.$listeners,
            },
        },
        [
            h(
                'div',
                {
                    staticClass: 'object-value',
                },
                'Null'
            ),
            h(
                'div',
                {
                    staticClass: 'object-type',
                },
                this.dump.attrs.typename
            ),
            h('span', { staticClass: 'flex-1' }),
            h(
                'ui-button',
                {
                    staticClass: 'tiny blue',
                    on: {
                        confirm: this.applyAction,
                    },
                },
                this.action
            ),
        ]
    );
};
