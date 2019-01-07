'use strict';

exports.template = `
    <div class="hint">
        <div class="box">
            {{tooltip}}
            <div ref="arrow" class="arrow"></div>
        </div>
    </div>
`;

exports.data = function() {
    return {
        position: '50%',
        tooltip: '',
        style: {}
    };
};

exports.methods = {
    setPosition(val) {
        if (this.position !== val) {
            this.position = val;
            const { classList } = this.$el;
            if (classList.contains('top') || classList.contains('bottom')) {
                if (val.startsWith('-')) {
                    this.$refs.arrow.style.right = val.substr(1);
                } else {
                    this.$refs.arrow.style.left = val;
                }
            } else if (classList.contains('left') || classList.contains('right')) {
                if (val.startsWith('-')) {
                    this.$refs.arrow.style.bottom = val.substr(1);
                } else {
                    this.$refs.arrow.style.top = val;
                }
            }
        }
    },

    setHint(text) {
        this.tooltip = text;
    }
};
