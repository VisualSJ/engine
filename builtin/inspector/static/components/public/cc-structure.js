'use strict';

exports.template = `
<div @confirm.stop="_onConfirm">
    <slot>
    </slot>
</div>
`;

exports.props = {
    dump: {
        required: true,
        type: Object
    }
};

exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispatch(dump) {
        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump
            }
        });

        this.$el.dispatchEvent(customEvent);
    },

    /**
     * value 修改
     */
    _onConfirm(event) {
        const { value } = event.target;
        const path = event.target.getAttribute('path');
        const dump = this.getDumpByPath(path);
        if (dump) {
            dump.value = value;
            this.dispatch(dump);
        } else {
            console.warn('please provide path for confirm event to change specified data');
        }
    },

    getDumpByPath(path) {
        if ((path + '').includes('.')) {
            const paths = (path + '').split('.');
            try {
                return paths.reduce((prev, next) => {
                    if (prev && prev[next]) {
                        return prev[next];
                    }
                    return false;
                }, this.dump);
            } catch (err) {
                console.error(err);
                return false;
            }
        }

        return path && this.dump[path] ? this.dump[path] : false;
    }
};
