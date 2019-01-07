'use strict';
const Vue = require('vue/dist/vue.js');
const Hint = require('./hint');
let tooltipEl = null;

function createTooltip(root) {
    if (!tooltipEl) {
        const ComponentClass = Vue.extend(Hint);
        tooltipEl = new ComponentClass();
        tooltipEl.$mount();
        root.appendChild(tooltipEl.$el);
    }
    tooltipEl.$el.style.display = 'none';
    tooltipEl.$el.style.position = 'absolute';
    tooltipEl.$el.style.maxWidth = '200px';
    tooltipEl.$el.style.zIndex = '999';
    tooltipEl.$el.classList = 'hint bottom shadow';
}

module.exports = {
    props: ['tooltip'],
    mounted() {
        this._$label = this.$el.querySelector('.label');
        this._$text = this.$el.querySelector('.label .text');
        this.init();
    },
    beforeDestroy() {
        this.destroy();
    },
    methods: {
        init() {
            this._$label.addEventListener('mouseenter', this.showTooltip);
            this._$label.addEventListener('mouseleave', this.hideTooltip);
        },
        destroy() {
            this._$label.removeEventListener('mouseenter', this.showTooltip);
            this._$label.removeEventListener('mouseleave', this.hideTooltip);
            this._$label = null;
            this._$text = null;
        },
        showTooltip() {
            if (this.tooltip) {
                createTooltip(this.$root.$el);
                tooltipEl.setPosition('20px');
                tooltipEl.setHint(this.tooltip);
                this._showTooltipId = setTimeout(() => {
                    this._showTooltipId = null;
                    tooltipEl.$el.style.display = 'block';
                    const boundary = this.$root.$el.getBoundingClientRect();
                    const textBoundary = this._$text.getBoundingClientRect();
                    const hintBoundary = tooltipEl.$el.getBoundingClientRect();
                    tooltipEl.$el.style.left = `${textBoundary.left - boundary.left - 10}px`;
                    tooltipEl.$el.style.top = `${textBoundary.top - boundary.top - hintBoundary.height - 10}px`;
                }, 200);
            }
        },

        hideTooltip() {
            if (this.tooltip) {
                clearTimeout(this._showTooltipId);
                this._showTooltipId = null;
                tooltipEl && (tooltipEl.$el.style.display = 'none');
            }
        },
    },
};
