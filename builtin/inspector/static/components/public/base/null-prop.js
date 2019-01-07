'use strict';

exports.template = `
    <ui-prop
        class="null-prop"
        :name="dump.name"
        :indent="indent"
    >
        <div class="object-value">Null</div>
        <div class="object-type">{{dump.attrs.typename}}</div>
        <span class="flex-1"></span>
        <ui-button
            class="tiny blue"
            @confirm="applyAction"
        >{{action}}</ui-button>
    </ui-prop>
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
};

exports.components = {
    'ui-prop': require('../ui-prop'),
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
